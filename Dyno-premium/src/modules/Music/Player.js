'use strict';

const moment = require('moment');
const WolkeStream = Loader.require('./modules/Music/WolkeStream');
const Base = Loader.require('./core/structures/Base');
const redis = require('../../core/redis');
const statsd = require('../../core/statsd');

require('moment-duration-format');

/**
 * @class Player
 * @extends Base
 */
class Player extends Base {
	constructor(module) {
		super();

		this.queue = module.queue;
		this.module = module;

		this.retries = new Map();
		this.playing = new Map();
		this.stopping = new Set();
		this.cooldowns = new Map();
		this.errCooldowns = new Map();
		this.nowPlayingIds = new Map();

		this.timers = [];

		this.resetPlaying();
	}

	unload() {
		if (this.timers.length) {
			for (let timer of this.timers) {
				clearTimeout(timer);
			}
		}
	}

	resetPlaying() {
		if (!this.client.voiceConnections.size) return;
		for (let conn of this.client.voiceConnections.values()) {
			if (this.playing.has(conn.id)) return;
			this.playing.set(conn.id, Date.now());
		}
	}

	runTasks() {
		for (const [id, time] of this.cooldowns.entries()) {
			if ((Date.now() - time) < 500) continue;
			this.cooldowns.delete(id);
		}
		for (const [id, time] of this.errCooldowns.entries()) {
			if ((Date.now() - time) < 500) continue;
			this.errCooldowns.delete(id);
		}
	}

	/**
	 * Get or create the voice connection
	 * @param {GuildChannel} channel channel object
	 * @returns {Promise.<VoiceConnection>} Resolves a connection object
	 */
	getConnection(channel) {
		let connection;

		if (!channel || !channel.guild) {
			return Promise.reject('Not a guild channel.');
		}

		if (!this.hasPermissions(channel.guild, 'voiceConnect', 'voiceSpeak')) {
			return Promise.reject(`I don't have permissions to join or speak in that channel`);
		}

		if (this.client.voiceConnections) {
			connection = this.client.voiceConnections.get(channel.guild.id);
			if (connection) return Promise.resolve(connection);
		}

		return this.client.joinVoiceChannel(channel.id);
	}

	/**
	 * Start playing a song
	 * @param {GuildChannel} channel The voice channel to play in
	 * @param {Object} [mediaInfo] The media info to play
	 * @param {Number} [volume=1] Volume to send to encoder
	 * @returns {Promise}
	 */
	async play(channel, mediaInfo, volume = 1) {
		const guildConfig = await this.dyno.guilds.getOrFetch(channel.guild.id);
		if (!guildConfig) return Promise.reject('Unable to get server configuration.');

		const musicChannelId = guildConfig.music ? guildConfig.music.channel || null : null,
			  musicChannel   = musicChannelId ? this.client.getChannel(musicChannelId) : null,
			  msgArray       = [];

		if (!guildConfig.isPremium && !this.playing.has(channel.guild.id)) {
			this.playing.set(channel.guild.id, Date.now());
		} else if (!guildConfig.isPremium) {
			if (mediaInfo && mediaInfo.length && mediaInfo.length > 1800) {
				return this.removeAndContinue(channel);
			}

			let time = this.playing.get(channel.guild.id);
			if ((Date.now() - time) >= 3600000) {
				this.playing.delete(channel.guild.id);
				if (this.client.voiceConnections.has(channel.guild.id)) {
					await this.stop(channel, true);
					if (musicChannel) {
						return this.sendMessage(musicChannel, `Leaving the channel for performance reasons, use ?play to continue or upgrade to remove this.`);
					}
				}
			}
		}

		try {
			var conn = await this.getConnection(channel);
		} catch (err) {
			await this.stop(channel, true);
			return Promise.reject('An error occurred trying to connect to the voice channel.\n' + err);
		}

		if (conn.playing) {
			await this.stop(channel);
		}

		let link = mediaInfo.audiourl;

		if (mediaInfo.audioformat === 'webm') {
			link = new WolkeStream(mediaInfo.audiourl);
		}

		const options = mediaInfo.audioformat === 'webm' ?
			{ format: 'webm', frameDuration: 20 } :
			{ encoderArgs: ['-af', `volume=${volume}`],
			  inputArgs: ['-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '2'] };

		redis.incr('music.plays');
		statsd.increment(`music.plays`);

		conn.play(link, options);

		conn.on('disconnect', () => this.stop(channel, true));

		conn.on('error', err => {
			if (err.message === 'read ECONNRESET') {
				return;
			}

			let leave = false;
			if (err.message.toLowerCase().includes('not ready yet')) {
				leave = true;
			}

			this.stop(channel, leave)
				.catch(() => false)
				.then(() => this.handleError(err, channel, musicChannel));
		});

		conn.once('end', () => {
			this.queue.shift(channel.guild.id).then(queue => {
				if (queue && queue.length) {
					return this.module.play(channel).catch(() => false);
				}

				if (musicChannel) {
					this.sendMessage(musicChannel, `Queue concluded.`);
				}

				return this.stop(channel, true);
			});
		});

		if (!musicChannel) return Promise.resolve();

		let cooldown = this.cooldowns.get(channel.id);
		if (cooldown && (Date.now() - cooldown) <= 500) {
			return Promise.resolve();
		}

		this.cooldowns.set(channel.id, Date.now());

		const length = mediaInfo.length ? moment.duration(mediaInfo.length, 'seconds').format('h[h] m[m] s[s]') : null;

		const embed = {
			color: this.utils.getColor('blue'),
			author: {
				name: `Now Playing: ${mediaInfo.title}`,
				icon_url: mediaInfo.thumbnail_url,
			},
			fields: [
				{ name: 'Link', value: `[Click Here](${mediaInfo.url})`, inline: true },
				{ name: 'Playlist', value: `[Click Here](${this.config.site.host}/playlist/${channel.guild.id}#${mediaInfo.video_id})`, inline: true },
			],
			timestamp: new Date(),
		};

		if (length) {
			embed.footer = { text: `Length: ${length}` };
		}

		if (mediaInfo.thumbnail_url) {
			embed.thumbnail = { url: mediaInfo.thumbnail_url };
		}
		
		const sortedMessages = [...musicChannel.messages.values()].sort((a, b) => (a.timestamp > b.timestamp) ? 1 : (a.timestamp < b.timestamp) ? -1 : 0);
		const lastMessage = sortedMessages ? sortedMessages.pop() : null;

		let nowPlaying = this.nowPlayingIds.get(musicChannel.id);
		if (nowPlaying && lastMessage && lastMessage.id === nowPlaying) {
			return lastMessage.edit({ embed });
		}

		return this.sendMessage(musicChannel, { embed })
			.then(msg => {
				this.nowPlayingIds.set(musicChannel.id, msg.id);
			});
	}

	/**
	 * Log connection errors
	 * @param {Error} err Error to log
	 * @param {GuildChannel} channel The voice channel where the error originated
	 */
	logError(err, channel) {
		let cooldown = this.errCooldowns.get(channel.id);
		if (cooldown && (Date.now() - cooldown) <= 500) {
			return;
		}

		this.errCooldowns.set(channel.id, Date.now());

		// log other errors
		try {
			this.logger.error(err, {
				type: 'player.conn.error',
				guild: channel.guild.id,
				shard: channel.guild.shard.id,
			});
		} catch (e) {
			console.error(err); // eslint-disable-line
		}
	}

	/**
	 * Handle connection errors
	 * @param {Error} err The error to handle/log
	 * @param {GuildChannel} channel The voice channel where the error originated
	 */
	handleError(err, channel) {
		if (err && err.message) {
			// ffmpeg error, remove song and continue
			if (err.message.includes('Command failed')) {
				this.logger.error(err);
				return this.skip(channel.guild.id, channel);
				// return this.removeAndContinue(channel);
			}

			if (err.message.includes('Timeout') || err.message.includes('TIMEDOUT')) {
				this.logError(err, channel);
				return this.stop(channel, true);
			}

			this.logError(err, channel);
		}

		let retries = this.retries.get(channel.id);
		if (retries && retries >= 3) {
			this.retries.delete(channel.id);
			return;
		}

		retries = retries || 0;
		this.retries.set(channel.id, ++retries);

		setTimeout(() => {
			this.module.play(channel).catch(() => false);
		}, 100 * retries);
	}

	/**
	 * Remove the song and continue the queue
	 * @param {GuildChannel} channel The voice channel
	 * @return {Promise}
	 */
	removeAndContinue(channel) {
		this.queue.shift(channel.guild.id, true).then(queue => {
			if (queue && queue.length) {
				return this.module.play(channel).catch(() => false);
			}

			return this.stop(channel, true);
		});
	}

	leaveChannel(channel) {
		try {
			this.client.leaveVoiceChannel(channel.id);
		} catch (err) {
			this.logger.error(err, {
				type: 'player.leaveChannel',
				guild: channel.guild.id,
				shard: channel.guild.shard.id,
			});
		}
		this.queue.delete(channel.guild.id);
	}

	/**
	 * Stop playing
	 * @param {GuildChannel} channel channel
	 * @param {Boolean} [leave] Leave the channel
	 */
	stop(channel, leave) {
		if (this.stopping.has(channel.id)) return Promise.resolve();

		this.stopping.add(channel.id);
		this.timers.push(setTimeout(() => {
			this.stopping.delete(channel.id);
		}, 3000));

		return new Promise(resolve => {
			this.getConnection(channel).then(conn => {
				if (conn) {
					conn.removeAllListeners('end');

					try {
						conn.stopPlaying();
					} catch (err) {
						// try just passing
						this.logger.error(err, {
							type: 'player.stop.stopPlaying',
							guild: channel.guild.id,
							shard: channel.guild.shard.id,
						});
					}
				} else {
					leave = true;
				}

				if (leave) {
					this.leaveChannel(channel);
				}

				return resolve();
			})
			.catch(() => this.leaveChannel(channel))
			.then(() => {
				if (this.stopping.has(channel.id)) {
					this.stopping.delete(channel.id);
				}
			});
		});
	}

	/**
	 * Skip the currently playing song
	 * @param {String} guildId Guild ID
	 * @param {GuildChannel} channel Voice channel
	 * @returns {Promise}
	 */
	skip(guildId, channel) {
		return new Promise((resolve, reject) =>
			this.stop(channel)
				.then(() => this.queue.shift(guildId)
					.then(() => this.module.play(channel).then(resolve).catch(reject)))
				.catch(reject));
	}
}

module.exports = Player;

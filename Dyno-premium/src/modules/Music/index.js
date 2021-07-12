'use strict';

const each = require('async-each');
const ytdl = Promise.promisifyAll(require('ytdl-core'), { suffix: 'Promise' });
const Module = Loader.require('./core/structures/Module');
const Queue = Loader.require('./modules/Music/Queue');
const Player = Loader.require('./modules/Music/Player');
const Search = Loader.require('./modules/Music/Search');
const utils = Loader.require('./core/utils');
const redis = require('../../core/redis');
const statsd = require('../../core/statsd');

require('moment-duration-format');

/**
 * @class Music
 * @extends Module
 */
class Music extends Module {
	/**
	 * Music module
	 * @param {Object} config Bot configuration
	 * @param {*} [args] Additional arguments that may be passed.
	 */
	constructor(...args) {
		super(...args);

		this.module = 'Music';
		this.description = 'Enables youtube search and playing.';
		this.enabled = true;
		this.hasPartial = true;

		this.version = 3.1;
	}

	/**
	 * Module name
	 * @returns {string}
	 */
	static get name() {
		return 'Music';
	}

	get settings() {
		return {
			role: String,
			channel: String,
			repeat: Boolean,
			modonly: Boolean,
			channelonly: Boolean,
			queue: { type: Array, default: [] },
			enableGlobal: { type: Boolean, default: false },
			bannedEnabled: { type: Boolean, default: false },
			bannedWords: { type: Array },
			bannedVideos: { type: Array },
			skipEnabled: { type: Boolean, default: true },
		};
	}

	/**
	 * Queue instance
	 * @returns {QueueCollection}
	 */
	get queue() {
		return this._queue;
	}

	/**
	 * Player instance
	 * @returns {Player}
	 */
	get player() {
		return this._player;
	}

	/**
	 * Search instance
	 * @returns {Search}
	 */
	get search() {
		return this._search;
	}

	/**
	 * Start the player module
	 */
	start() {
		this._queue = this.config.queue || new Queue(this);
		this._player = new Player(this);
		this._search = new Search(this);

		this.volume = new Map();
		this.votes = new Map();
		this.limits = new Map();

		this.schedule('*/5 * * * *', this.runTasks.bind(this));
		this.schedule('0,15,30,45 * * * * *', this.updateStats.bind(this));
	}

	unload() {
		if (this._player && this._player.unload) {
			this._player.unload();
		}
	}

	/**
	 * Run scheduled tasks
	 * @private
	 */
	runTasks() {
		this.checkConnections();
		this.search.clearCache();
		this.clearLimits();
		if (this.player.runTasks) {
			this.player.runTasks();
		}
	}

	updateStats() {
		let playingConnections = [...this.client.voiceConnections.values()].filter(c => c.playing && !c.ended);
		redis.hsetAsync(`dyno:vc:${this.config.client.id}`, `${this.dyno.options.clusterId}:${this.config.state}`, playingConnections.length || 0)
			.catch(() => null);
	}

	/**
	 * Check connections for empty channels
	 * @returns {*}
	 * @private
	 */
	checkConnections() {
		const voiceConnections = this.client.voiceConnections;
		if (!voiceConnections || !voiceConnections.size) return;

		each([...voiceConnections.values()], conn => {
			let channel;

			try {
				channel = this.client.getChannel(conn.channelID);
			} catch (err) {
				this.logger.error(err, {
					type: 'music.checkConnections.getChannel',
					guildId: conn.id,
				});
			}

			if (!channel) return;
			if (this.player.stopping.has(channel.id)) return;

			if (!conn.playing && conn.ended && !conn.connecting) {
				return this.player.stop(channel, true);
			}

			const voiceMembers = channel.voiceMembers.filter(m => !m.bot);

			if (voiceMembers.size === 0 && channel.voiceMembers.has(this.client.user.id)) {
				this.player.stop(channel, true);
			}
		});

		return true;
	}

	async isStreamLimited(guild) {
		if (this.config.isPremium) return false;
		if ((Date.now() - guild.joinedAt) / 1000 < this.config.streamLimitThreshold) {
			return false;
		}

		let streamCount = await this.getStreamCount();

		if (streamCount >= this.config.maxStreamLimit) {
			return true;
		}
	}

	/**
	 * Check if the user can command the bot
	 * @param {Message} msg Message object
	 * @param {Boolean} [needsPerms] If the user needs permissions
	 * @returns {Boolean} If the user can command
	 */
	canCommand(msg, needsPerms) {
		let guildConfig = this.dyno.guilds.get(msg.channel.guild.id);
		if (!guildConfig || !guildConfig.music) return true;

		needsPerms = needsPerms || false;

		// always return true for admins and mods
		// checking isServerMod will return true for admins also
		if (this.permissionsManager.isServerMod(msg.member, msg.channel)) {
			return true;
		}

		if (guildConfig.music.role) {
			if (msg.member.roles && msg.member.roles.includes(guildConfig.music.role)) {
				return true;
			}
		}

		if (guildConfig.music.modonly && guildConfig.music.role) {
			if (msg.member.roles && msg.member.roles.includes(guildConfig.music.role)) {
				return true;
			}

			return false;
		}

		// if command needs permissions, check role
		if (needsPerms && guildConfig.music.role) {
			if (msg.member.roles && msg.member.roles.includes(guildConfig.music.role)) {
				return true;
			}

			return false;
		}

		// if commands are channel only, check channel
		if (guildConfig.music.channelonly && guildConfig.music.channel) {
			if (msg.channel.id !== guildConfig.music.channel) {
				return false;
			}
		}

		return !needsPerms;
	}

	/**
	 * Check if the user is a music commander
	 * @param {Message} msg Message object
	 * @returns {Boolean} If the user is a music commander
	 */
	isCommander(msg) {
		const guildConfig = this.dyno.guilds.get(msg.channel.guild.id);

		if (!guildConfig.music || !guildConfig.music.role) return false;
		return msg.member.roles && msg.member.roles.includes(guildConfig.music.role);
	}

	isBanned(search, guildConfig) {
		const globalConfig = this.dyno.globalConfig.music;

		if (!guildConfig.music.bannedEnabled) return false;

		let bannedList = guildConfig.music.bannedWords || [];

		if (guildConfig.music.globalEnabled && globalConfig) {
			if (search.type === 'vid' && globalConfig.bannedVideos.includes(search.content)) {
				return true;
			} else if (globalConfig.bannedWords.length) {
				bannedList = bannedList.concat(globalConfig.bannedWords);
			}
		}

		if (guildConfig.music.bannedVideos && guildConfig.music.bannedVideos.length) {
			if (search.type === 'vid' && guildConfig.music.bannedVideos.includes(search.content)) {
				return true;
			}
		}

		if (!bannedList.length) return false;

		bannedList = bannedList.map(w => {
			w = utils.regEscape(w);
			return w.replace(/(^\s)/, '(?:^|\\s)').replace(/\s$/, '(?:\\s|$)');
		});

		const regex = new RegExp(bannedList.join('|'), 'gi');
		if (search.content.match(regex)) {
			return true;
		}

		return false;
	}

	/**
	 * Toggle repeat option
	 * @param {Message} msg Message object
	 * @returns {Promise}
	 */
	async toggleRepeat(msg) {
		const config = await this.dyno.guilds.getOrFetch(msg.channel.guild.id);

		config.music = config.music || {};
		config.music.repeat = !config.music.repeat;

		try {
			await this.dyno.guilds.update(msg.channel.guild.id, { $set: { 'music.repeat': config.music.repeat } });
		} catch (err) {
			this.logger.error(err, {
				type: 'music.toggleRepeat.update',
				guild: msg.channel.guild.id,
				shard: msg.channel.guild.shard.id,
			});
			return this.error(msg.channel, 'Something went wrong.');
		}

		return this.success(msg.channel, config.music.repeat ? 'Repeat enabled' : 'Repeat disabled');
	}

	getFormatUrl(type, formats) {
		formats.sort((a, b) => b.audioBitrate - a.audioBitrate);

		const bestaudio = formats.find(f => f.audioBitrate > 0 && !f.bitrate) || formats.find(f => f.audioBitrate > 0);

		if (!bestaudio.url) {
			return;
		}

		bestaudio._format = type;

		return bestaudio;
	}

	getBestAudio(mediaInfo, premium) {
		let formats = [];

		if (!premium) {
			// get webm opus formats
	        formats = mediaInfo.formats.filter(f => parseInt(f.itag) === 249);
	        if (!formats || !formats.length) {
	                formats = mediaInfo.formats.filter(f => parseInt(f.itag) === 250);
	        }

			if (formats && formats.length) {
				return this.getFormatUrl('webm', formats);
			}
		}

		// get mp4 audio only formats
        formats = mediaInfo.formats.filter(f => [141, 140, 139].includes(parseInt(f.itag)));

        if (!premium) {
	        // webm opus fallback
	        if (!formats || !formats.length) {
	                formats = mediaInfo.formats.filter(f => parseInt(f.itag) === 251);
	                if (formats && formats.length) {
	                        return this.getFormatUrl('webm', formats);
	                }
	        }
	    }

		if (!formats || !formats.length) {
			// get any other mp4 formats
			formats = mediaInfo.formats.filter(f => f.container === 'mp4');
		}

		if (formats && formats.length) return this.getFormatUrl('mp4', formats);
	}

	/**
	 * Get song info from ytdl
	 * @param {String} url URL to fetch
	 * @param {Boolean} [fetchAll] whether to return the raw ytdl data or formatted data
	 * @returns {Promise.<Object,Error>}
	 */
	async getInfo(url, guildId, fetchAll) {
		let info;

		try {
			info = await ytdl.getInfoPromise(url);
		} catch (err) {
			return Promise.reject(err);
		}

		if (!info || !info.video_id) {
			return Promise.reject('An error occurred while getting video info. No video id. Please try another.');
		}

		info.url = `https://www.youtube.com/watch?v=${info.video_id}`;

		const volume = this.volume.get(guildId) || 1;
		let premium = false;

		if (volume !== 1) {
			let guildConfig = this.dyno.guilds.get(guildId);
			premium = guildConfig && guildConfig.isPremium;
		}

		const bestaudio = this.getBestAudio(info, premium);

		if (bestaudio.url) {
			const match = new RegExp('&expire=([0-9]+)').exec(bestaudio.url);
			if (match && match.length) {
				info.expires = parseInt(match[1]) - 900;
			}
		}

		let formattedInfo = {
			video_id: info.video_id,
			title: info.title,
			thumbnail_url: info.thumbnail_url,
			url: info.url,
			audiourl: bestaudio.url,
			audioformat: bestaudio._format,
			audiotype: bestaudio.itag,
			// expires: info.expires ? info.expires - Date.now() - 300 : null,
			length: parseInt(info.length_seconds),
			v: this.version,
		};

		info = fetchAll ? info : formattedInfo;

		this.debug('Media info pulled from api.');

		redis.multi()
			// .setex(key, formattedInfo.expires || 21600, JSON.stringify(formattedInfo))
			.hincrby('music.info.formats', formattedInfo.audiotype, 1)
			.hincrby('music.info.counts', 'api', 1)
			.exec();

		return Promise.resolve(info);
	}

	/**
	 * Add a song to the queue
	 * @param {String} guildId Guild ID
	 * @param {GuildChannel} voiceChannel Eris guild channel
	 * @param {Object} mediaInfo The song info to queue
	 * @returns {Promise}
	 */
	async queueSong(guildId, voiceChannel, mediaInfo) {
		// start playing this song if we're not already playing
		if (!this.getPlayingState(voiceChannel)) {
			await this.queue.add(guildId, mediaInfo, true);

			statsd.increment('music.queues');

			if (mediaInfo.audiourl) {
				try {
					this.play(voiceChannel, mediaInfo);
				} catch (err) {
					return Promise.reject(err);
				}

				return Promise.resolve(mediaInfo);
			}

			try {
				await this.play(voiceChannel);
			} catch (err) {
				return Promise.reject(err);
			}

			return Promise.resolve(mediaInfo);
		}

		// push to the end of the queue
		await this.queue.add(guildId, mediaInfo);

		return Promise.resolve(mediaInfo);
	}

	/**
	 * Checks if the bot is currently playing audio
	 * @param {Object} channel Channel object
	 * @returns {boolean}
	 */
	getPlayingState(guildOrChannel) {
		let guildId = (typeof guildOrChannel === 'string') ? guildOrChannel : null;

		if (!guildId) {
			guildId = guildOrChannel.guild ? guildOrChannel.guild.id : guildOrChannel.id;
		}

		const conn = this.client.voiceConnections.get(guildId);
		if (!conn) return false;

		return conn.playing;
	}

	isRateLimited(channel) {
		const limit = this.limits.get(channel.id);

		if (limit && limit.time) {
			if ((Date.now() - limit.time) < 2000 && limit.count > 2) return true;
			if ((Date.now() - limit.time) > 3000) {
				this.limits.set(channel.id, {
					guild: channel.guild.id,
					channel: channel.id,
					time: Date.now(),
					count: 1,
				});

				return false;
			}
			limit.count++;
		} else {
			this.limits.set(channel.id, {
				guild: channel.guild.id,
				channel: channel.id,
				time: Date.now(),
				count: 1,
			});
		}

		return false;
	}

	clearLimits() {
		if (this.limits.size) {
			for (let [id, limit] of this.limits.entries()) {
				if ((Date.now() - limit.time) > 3000) {
					this.limits.delete(id);
				}
			}
		}
	}

	/**
	 * Add song to queue
	 * @param {String} guildId Guild ID
	 * @param {GuildChannel} voiceChannel Voice channel of the user
	 * @param {String|Object} url URL to add
	 */
	async add(guildId, voiceChannel, url) {
		if (Array.isArray(url)) {
			var results = url;
			url = results.shift();
		}

		if (typeof url === 'object') url = url.url;
		if (typeof url !== 'string') return Promise.reject('That url is invalid.');

		url = url.replace('/<|>/g', '');

		try {
			var mediaInfo = await this.getInfo(url, guildId);
		} catch (err) {
			if (results && results.length) {
				return this.add(guildId, voiceChannel, results);
			}

			return Promise.reject(err);
		}

		const guildConfig = await this.dyno.guilds.getOrFetch(guildId);
		if (!guildConfig) {
			return Promise.reject('Something went wrong.');
		}

		if (mediaInfo && !guildConfig.isPremium && mediaInfo.length && mediaInfo.length > 1800) {
			return Promise.reject('20m');
			// return Promise.reject(`The song is longer than 60 minutes, this is limited for performance purposes.`);
		}

		return this.queueSong(guildId, voiceChannel, mediaInfo);
	}

	/**
	 * Start playing the queue
	 * @param  {GuildChannel} channel Channel object
	 * @param  {Object} [mediaInfo] optional mediaInfo
	 * @returns {Promise}
	 */
	async play(channel, mediaInfo) {
		if (channel.voiceMembers.size === 1 && channel.voiceMembers.has(this.client.user.id)) {
			return this.player.stop(channel, true);
		}

		if (this.isRateLimited(channel)) {
			return this.player.stop(channel, true);
		}

		const guildId = channel.guild.id;

		if (await this.queue.isEmpty(guildId)) {
			return Promise.reject('No songs in queue.');
		}

		const volume = this.volume.get(guildId) || 1;
		const queue = await this.queue.fetch(guildId);
		const item = queue[0];

		// ensure the queued item is the correct format
		if (typeof item !== 'object' || !item.v) {
			this.queue.shift(guildId);
			return this.play(channel);
		}

		if (mediaInfo && mediaInfo.v === this.version) {
			return this.player.play(channel, mediaInfo, volume);
		}

		const url = mediaInfo ? mediaInfo.url || item.url : item.url;
		const version = mediaInfo ? mediaInfo.v || null : null;

		try {
			mediaInfo = await this.getInfo(url, guildId);
		} catch (err) {
			return Promise.reject(err);
		}

		if (!mediaInfo) {
			this.queue.remove(channel.guild.id);
			return this.play(channel);
		}

		if (!version || version !== this.version) {
			queue[0] = mediaInfo;
			this.queue.save(guildId, queue);
		}

		if (this.getPlayingState(channel)) {
			this.player.stop(channel);
		}

		return this.player.play(channel, mediaInfo, volume);
	}

	/**
	 * Play a song by queue index
	 * @param {String} guildId Guild ID
	 * @param {GuildChannel} channel Voice channel of the user
	 * @param {Number} index Index of the queued item
	 * @returns {Promise}
	 */
	async playByIndex(guildId, channel, index) {
		let result;

		if (await this.queue.isEmpty(guildId)) {
			return Promise.reject('The queue is empty.');
		}

		const queue = await this.queue.fetch(guildId);

		if (this.getPlayingState(channel)) {
			await this.player.stop(channel);
		}

		result = (!index) ? queue.pop() : queue.splice(--index, 1).shift();

		queue.unshift(result);
		this.queue.save(guildId, queue);

		return this.play(channel);
	}

	/**
	 * Skip song
	 * @param {Object} msg Message object
	 * @param {Boolean} force Force skip the song
	 */
	async skip(msg, force) {
		let channel = this.client.getChannel(msg.member.voiceState.channelID);

		// return if there's nothing in queue
		if (await this.queue.isEmpty(msg.channel.guild.id)) return Promise.resolve();

		if (!force && channel.voiceMembers.size > 2) {
			let vote = this.votes.get(msg.channel.guild.id);
			vote = vote || [];

			if (vote.includes(msg.author.id)) {
				return this.sendMessage(msg.channel, 'You have already voted.');
			}

			vote.push(msg.author.id);

			if ((vote.length / channel.voiceMembers.size) < 0.5) {
				this.votes.set(msg.channel.guild.id, vote);
				return this.sendMessage(msg.channel, 'Your vote has been added, more votes are needed.');
			} else {
				this.votes.set(msg.channel.guild.id, 0);
			}
		}

		this.votes.set(msg.channel.guild.id, 0);

		return this.player.skip(msg.channel.guild.id, channel);
	}

	/**
	 * Set volume to play in discord
	 * @param  {Message} msg Message object
	 * @param  {Number} volume Volume level (0-100)
	 */
	setVolume(msg, volume) {
		this.volume.set(msg.channel.guild.id, (parseInt(volume, 10) * 1.5) / 100);
	}
}

module.exports = Music;

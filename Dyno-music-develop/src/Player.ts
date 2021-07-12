import { Base } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as dyno from 'Dyno';
import { PlayerManager } from 'eris-lavalink';
import * as moment from 'moment';
import Queue from './Queue';
import Resolver from './Resolver';

require('moment-duration-format');

/**
 * Dyno music player
 * @class Player
 * @extends Base
 */
export default class Player extends Base {
	public cooldown      : number  = null;
	public errorCooldown : number  = null;
	public guild         : eris.Guild;
	public module        : any;
	public node          : any     = null;
	public nowPlayingId  : string  = null;
	public player        : any     = null;
	public playing       : boolean = false;
	public queue         : Queue;
	public track         : any;
	public resolver      : Resolver;
	public startTime     : number  = null;
	public stopping      : boolean = false;
	public timers        : any[]   = [];
	public textChannel   : ErisChannel;
	public voiceChannel  : ErisChannel;
	public volume        : number  = null;
	public votes         : Set<string> = new Set();
	public isDead        : boolean = false;

	constructor(dynoInstance: dyno.Dyno, module: any, data: PlayerData) {
		super(dynoInstance, data.guild);

		const guildConfig = data.guildConfig;
		let textChannel;

		guildConfig.music = guildConfig.music || {};

		if (guildConfig.music.channel) {
			textChannel = data.guild.channels.get(guildConfig.music.channel);
		}

		this.textChannel  = textChannel || data.textChannel;
		this.voiceChannel = data.voiceChannel;
		this.guild        = data.guild;
		this.module       = module;
		this.resolver     = new Resolver(this.dyno, {
			guild       : data.guild,
			guildConfig : data.guildConfig,
			module      : this,
			version     : data.version,
		});
	}

	public async getQueue() {
		const queue = new Queue(this.dyno, this.guild);
		await queue.getQueue();
		this.queue = queue;
		return this.queue;
	}

	/**
	 * Join the voice channel
	 */
	public connect(): Promise<eris.VoiceConnection> {
		if (this.voiceChannel == undefined || this.guild == undefined) {
			return Promise.reject('Not a guild channel.');
		}

		const missingPermissions = this.isMissingPermissions('voiceConnect', 'voiceSpeak', 'voiceUseVAD');
		if (missingPermissions != undefined) {
			return Promise.reject(`I don't have connect, speak, or use voice activity permissions in that channel.`);
		}

		if (this.client.voiceConnections) {
			const player = this.client.voiceConnections.get(this.guild.id);
			if (player) {
				return Promise.resolve(player);
			}
		}

		const options: any = {};
		if (this.guild.region != undefined) {
			options.region = this.guild.region;
		}

		const voiceConnections: PlayerManager = this.client.voiceConnections;

		return this.client.joinVoiceChannel(this.voiceChannel.id).then((player: any) => {
			this.player = player;
			this.node = player.node;

			this.player.on('error', async (err: string) => {
				this.playing = false;
				this.logError(err, 'player.error');
				this.stop();
				await this.queue.shift();
				return new Promise((res: any, rej: any) =>
					setTimeout(() =>
						this.play().then(res).catch(rej), 100));
			});

			this.player.on('disconnect', (err?: string) => {
				this.playing = false;
				if (err == undefined) {
					return;
				}
				this.logError(err, 'player.disconnect');
			});
		});
	}

	public async add(guildConfig: dyno.GuildConfig, options: PlayOptions) {
		const prepend = !this.playing;
		const search = options.search;
		let queueItem: QueueItem;
		let tracks: QueueItems;

		await this.queue.getQueue();

		try {
			tracks = await this.resolver.resolveTracks(search);
			if (tracks == undefined || tracks.length === 0) {
				return Promise.reject(`No results for ${search}`);
			}

			queueItem = tracks[0];
			if (queueItem == undefined) {
				return Promise.reject(`No results found for ${search}`);
			}
		} catch (err) {
			throw err;
		}

		if (guildConfig.isPremium !== true && queueItem != undefined) {
			if (queueItem.length < 30) {
				return Promise.reject(`That song is less then 30 seconds, please try another.`);
			}

			const maxSongLength = this.config.maxSongLength ? this.config.maxSongLength : 5400;
			if (queueItem.length > maxSongLength) {
				return Promise.reject('60m');
			}
		}

		const isLink = (search.includes('youtu.be') || search.includes('youtube.com'));
		if (guildConfig.isPremium === true && isLink === true && tracks.length > 1) {
			this.statsd.increment('music.playlists');

			try {
				tracks = await this.queue.bulkAdd(tracks);
			} catch (err) {
				throw err;
			}

			if (options.channel != undefined) {
				this.sendMessage(options.channel, `Added ${tracks.length} songs to the queue.`).catch(() => null);
			}

			return tracks;
		} else {
			this.statsd.increment('music.adds');

			try {
				await this.queue.add(queueItem, prepend);
			} catch (err) {
				throw err;
			}

			if (options.channel != undefined) {
				this.sendMessage(options.channel, `Added ${queueItem.title} to the queue.`).catch(() => null);
			}

			return queueItem;
		}
	}

	// tslint:disable-next-line:cyclomatic-complexity
	public async play(guildConfig?: dyno.GuildConfig, options?: PlayOptions) {
		if (this.isDead) {
			return false;
		}

		let trackInfo;

		if (guildConfig == undefined) {
			guildConfig = await this.dyno.guilds.getOrFetch(this.guild.id);
		}

		if (!this.queue) {
			await this.getQueue();
		} else {
			await this.queue.getQueue();
		}

		if (options && options.search) {
			try {
				trackInfo = await this.add(guildConfig, options);
			} catch (err) {
				throw err;
			}

			if (this.playing === true) {
				return;
			}
		}

		trackInfo = await this.getTrack();
		if (!trackInfo) {
			if (this.queue.size > 1) {
				await this.queue.shift();
				return this.play(guildConfig);
			} else {
				this.queue.remove();
				throw new Error(`I can't play that song right now, please try another.`);
			}
		}

		this.startTime = Date.now();

		if (guildConfig.isPremium !== true) {
			if (trackInfo != undefined && trackInfo.length > 0) {
				const maxSongLength = this.config.maxSongLength ? this.config.maxSongLength : 5400;
				if (trackInfo.length < 30 || trackInfo.length > maxSongLength) {
					return this.skip();
				}
			}

			const maxPlayingTime = this.config.maxPlayingTime ? this.config.maxPlayingTime : 14400;
			if ((Date.now() - this.startTime) >= maxPlayingTime) {
				this.stop(true);
				if (this.textChannel != undefined) {
					return this.sendMessage(this.textChannel,
						'Leaving the channel for performance reasons, use ?play to continue or upgrade to remove this.');
				}
			}
		}

		if (!trackInfo == undefined) {
			throw new Error('TrackInfoError: No track info.');
		}

		if (trackInfo.track == undefined) {
			throw new Error('TrackInfoError: No track provided.');
		}

		this.track = trackInfo;

		if (!this.volume && guildConfig.music.volume) {
			this.setVolume(guildConfig.music.volume);
		}

		this.player.play(trackInfo.track);
		this.playing = true;

		this.player.once('end', (data: any) => {
			this.votes = new Set();

			if (data.reason != undefined && data.reason === 'REPLACED') {
				return;
			}
			this.playing = false;
			this.queue.shift().then((queue: QueueItems) => {
				if (queue !== undefined && queue.length > 0) {
					return this.play(guildConfig).catch((err: string) => {
						this.logError(err, 'player.on.end');
					});
				}

				if (this.textChannel != undefined) {
					this.sendMessage(this.textChannel, `Queue concluded.`).catch(() => null);
				}

				this.stop(true);
			}).catch(() => null);
		});

		this.statsd.increment('music.plays');

		this.announce(trackInfo).catch(() => null);
	}

	public stop(leave?: boolean): void {
		if (this.stopping === true) {
			return;
		}
		this.stopping = true;

		setTimeout(() => {
			this.stopping = false;
		}, 3000);

		this.volume = null;
		this.votes = new Set();

		if (this.player != undefined) {
			this.player.removeAllListeners('end');

			if (leave === true) {
				this.client.leaveVoiceChannel(this.voiceChannel.id);
				return this.destroy();
			}

			try {
				this.playing = false;
				this.player.stop();
			} catch (err) {
				this.logError(err, 'player.stop');
			}

			if (this.stopping === true) {
				this.stopping = false;
			}
		} else {
			this.playing = false;
			try {
				this.client.leaveVoiceChannel(this.voiceChannel.id);
				this.destroy();
			} catch (err) {
				this.logError(err, 'player.stop');
			}
		}
	}

	public async skip(message?: eris.Message, guildConfig?: dyno.GuildConfig, force?: boolean): Promise<any> {
		if (message !== undefined && force !== true && this.voiceChannel.voiceMembers.size > 2) {
			if (this.votes.has(message.author.id)) {
				return this.sendMessage(message.channel, 'You have already voted.');
			}

			if ((this.votes.size / this.voiceChannel.voiceMembers.size) < 0.5) {
				this.votes.add(message.author.id);
				return this.sendMessage(message.channel, 'Your vote has been added, more votes are needed.');
			} else {
				this.votes = new Set();
			}
		}

		if (this.queue.isEmpty()) {
			await this.queue.getQueue();
		}

		this.statsd.increment('music.skips');

		if (this.track && this.track.isSeekable) {
			const position = (this.track.length - 2) * 1000;
			if (this.playing) {
				return this.player.seek(position);
			}
			return this.play(guildConfig).catch(() => false);
		} else {
			try {
				this.stop();
				await this.queue.shift();
				return this.play(guildConfig);
			} catch (err) {
				this.logError(err, 'player.skip');
			}
		}
	}

	public setVolume(volume: number): void {
		this.volume = volume;
		if (this.player) {
			this.player.setVolume(volume);
		}
	}

	public async seek(message: eris.Message, position: number): Promise<any> {
		if (position > (this.track.length * 1000)) {
			return Promise.reject(`The song isn't that long.`);
		}

		this.player.seek(position);
		return Promise.resolve();
	}

	public async playQueueItem(guildConfig: dyno.GuildConfig, index: string|number): Promise<any> {
		if (this.queue.isEmpty()) {
			await this.queue.getQueue();
		}

		if (typeof index === 'string') {
			index = parseInt(index, 10);
		}

		let track = await this.queue.remove(index);

		if (!track.v || track.v !== this.module.version) {
			try {
				const tracks = await this.resolver.resolveTracks(track.uri || track.url);
				track = tracks[0];
			} catch (err) {
				throw err;
			}
		}

		this.queue.add(track, true);

		return this.play(guildConfig);
	}

	public async announce(queueItem: QueueItem, channel?: ErisChannel): Promise<any> {
		if (this.textChannel == undefined) {
			return;
		}

		if (this.cooldown !== undefined && (Date.now() - this.cooldown) <= 500) {
			return;
		}
		this.cooldown = Date.now();

		if (queueItem == undefined) {
			queueItem = await this.getTrack();
		}

		let length;
		if (queueItem.length > 0 && queueItem.length < 37000) {
			const duration: any = moment.duration(queueItem.length, 'seconds');
			length = duration.format('h[h] m[m] s[s]');
		} else if (queueItem.length > 37000) {
			length = '∞';
		}

		let thumbnail = '';
		const uri = queueItem.uri || queueItem.url;
		if (uri.includes('soundcloud.com')) {
			thumbnail = ``;
		} else {
			thumbnail = `http://img.youtube.com/vi/${queueItem.identifier}/default.jpg`;
		}

		const embed: eris.EmbedBase = {
			color: this.utils.getColor('blue'),
			title: `:notes: Now Playing: ${queueItem.title}`,
			fields: [
				{ name: 'Link', value: `[Click Here](${uri})`, inline: true },
				{ name: 'Playlist', value: `[Click Here](${this.config.site.host}/playlist/${this.guild.id}#${queueItem.identifier})`, inline: true },
			],
			thumbnail: { url: thumbnail },
			timestamp: (new Date()).toISOString(),
		};

		if (length !== undefined) {
			embed.footer = { text: `Length: ${length}` };
		}

		if (channel !== undefined) {
			return this.sendMessage(channel, { embed });
		}

		let sortedMessages = null;
		let lastMessage;

		if (this.textChannel.messages != undefined && this.textChannel.messages.size > 0) {
			sortedMessages = [...this.textChannel.messages.values()].sort((a: eris.Message, b: eris.Message) =>
				(a.timestamp > b.timestamp) ? 1 : (a.timestamp < b.timestamp) ? -1 : 0);

			lastMessage = sortedMessages ? sortedMessages.pop() : null;
		}

		if (this.nowPlayingId !== undefined && lastMessage !== undefined && lastMessage.id === this.nowPlayingId) {
			return lastMessage.edit({ embed });
		}

		return this.sendMessage(this.textChannel, { embed }).then((msg: eris.Message) => {
			this.nowPlayingId = msg.id;
		});
	}

	public destroy(): void {
		this.isDead = true;
		this.module.deletePlayer(this.guild);
		process.nextTick(() => {
			// this.module = null;
		});
	}

	private isMissingPermissions(...perms: string[]): string[] {
		const permissions = this.voiceChannel.permissionsOf(this.client.user.id);
		const missingPermissions = [];

		for (const perm of perms) {
			if (permissions.has(perm) !== true) {
				missingPermissions.push(perm);
			}
		}

		return missingPermissions.length > 0 ? missingPermissions : null;
	}

	private async getTrack(): Promise<QueueItem> {
		const queue = await this.queue.getQueue();
		let track = queue.length > 0 ? queue[0] : null;
		if (track == null) {
			return null;
		}

		if (track.v !== undefined && track.v === this.module.version) {
			return track;
		}

		const url = track.uri !== undefined ? track.uri : track.url;
		if (url == undefined) {
			return null;
		}

		try {
			const tracks = await this.resolver.resolveTracks(url);
			track = tracks[0];
		} catch (err) {
			throw err;
		}

		if (track !== undefined) {
			try {
				await this.queue.replace(0, track);
			} catch (err) {
				throw err;
			}
		}

		return track;
	}
}

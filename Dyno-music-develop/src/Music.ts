import {Module} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as each from 'async-each';
import * as dyno from 'Dyno';
import * as commands from './commands';
import Lavalink from './Lavalink';
import QueueModel from './models/Queue';
import SavedQueue from './models/SavedQueue';
import Player from './Player';
import Queue from './Queue';

/**
 * Dyno music module
 * @class Music
 * @extends Module
 */
export default class Music extends Module {
	public module         : string  = 'Music';
	public description    : string  = 'Enables youtube search and playing.';
	public list           : boolean = true;
	public enabled        : boolean = true;
	public hasPartial     : boolean = true;
	public version        : number  = 4.0;
	public commands       : {}      = commands;
	public queues         : Map<string, Queue>;
	public moduleModels   : any[] = [
		QueueModel,
		SavedQueue,
	];

	private connectionTask: NodeJS.Timer;
	private statsTask     : NodeJS.Timer;
	private lavalink      : Lavalink;

	constructor(dynoInstance: dyno.Dyno) {
		super(dynoInstance);

		if (this.dyno.players == undefined) {
			this.dyno.players = new Map();
		}
	}

	public get settings() {
		return {
			role            : String,
			channel         : String,
			repeat          : Boolean,
			modonly         : Boolean,
			channelonly     : Boolean,
			queue           : { type : Array, default   : [] },
			enableGlobal    : { type : Boolean, default : false },
			bannedEnabled   : { type : Boolean, default : false },
			bannedWords     : { type : Array },
			bannedVideos    : { type : Array },
			skipEnabled     : { type : Boolean, default : true },
			autojoinChannel : { type : String },
			ignoredRoles 	: { type : Array, default: [] },
		};
	}

	public get players(): Map<string, Player> {
		return this.dyno.players;
	}

	/**
	 * Start the player module
	 */
	public start() {
		this.connectionTask = setInterval(this.connectionCheck.bind(this), 300000);
		this.statsTask = setInterval(this.updateStats.bind(this), 15000);
		this.queues = new Map();

		this.lavalink = new Lavalink(this.dyno);

		this.schedule('*/3 * * * * *', this.lavalink.checkNodes.bind(this));
	}

	public unload() {
		clearTimeout(this.connectionTask);
		clearTimeout(this.statsTask);
	}

	public async getPlayerCount(): Promise<number> {
		let vcs;

		try {
			vcs = await this.redis.hgetall(`dyno:vc:${this.config.client.id}`);
		} catch (err) {
			this.logger.error(err);
			return this.config.maxStreamLimit;
		}

		return Object.values(vcs).reduce((a: number, b: string) => {
			a += parseInt(b, 10); return a;
		}, 0);
	}

	public async isStreamLimited(guild: eris.Guild): Promise<boolean> {
		if (this.config.isPremium) {
			return false;
		}

		if ((Date.now() - guild.joinedAt) / 1000 < this.config.streamLimitThreshold) {
			return false;
		}

		const playerCount = await this.getPlayerCount();
		if (playerCount >= this.config.maxStreamLimit) {
			return true;
		}
	}

	public canCommand(message: eris.Message, requirePermissions?: boolean): boolean {
		const guild = (<eris.GuildChannel>message.channel).guild;

		if (!this.dyno.guilds.has(guild.id)) {
			return false;
		}

		const guildConfig = this.dyno.guilds.get(guild.id);
		if (guildConfig.music == undefined) {
			return true;
		}

		requirePermissions = requirePermissions || false;

		// always return true for admins and mods
		// checking isServerMod will return true for admins also
		if (this.permissionsManager.isServerMod(message.member, message.channel)) {
			return true;
		}

		if (guildConfig.music.ignoredRoles && guildConfig.music.ignoredRoles.length > 0) {
			if (message.member.roles.find((r: string) => guildConfig.music.ignoredRoles.includes(r))) {
				return false;
			}
		}

		if (guildConfig.music.role != undefined) {
			if (message.member.roles.length > 0 && message.member.roles.includes(guildConfig.music.role)) {
				return true;
			}

			if (guildConfig.music.modonly) {
				return false;
			}
		}

		// if command needs permissions, check role
		if (requirePermissions && guildConfig.music.role) {
			if (message.member.roles.length > 0 && message.member.roles.includes(guildConfig.music.role)) {
				return true;
			}

			return false;
		}

		return !requirePermissions;
	}

	public canPlayInChannel(message: eris.Message): boolean {
		const guild = (<eris.GuildChannel>message.channel).guild;

		if (!this.dyno.guilds.has(guild.id)) {
			return false;
		}

		if (this.permissionsManager.isServerMod(message.member, message.channel)) {
			return true;
		}

		const guildConfig = this.dyno.guilds.get(guild.id);
		if (guildConfig.music == undefined) {
			return true;
		}

		// if commands are channel only, check channel
		if (guildConfig.music.channelonly && guildConfig.music.channel != undefined) {
			if (message.channel.id !== guildConfig.music.channel) {
				return false;
			}
		}

		return true;
	}

	public isCommander(message: eris.Message): boolean {
		const guild = (<eris.GuildChannel>message.channel).guild;
		const guildConfig = this.dyno.guilds.get(guild.id);
		if (guildConfig.music == undefined || guildConfig.music.role == undefined) {
			return false;
		}
		return message.member.roles != undefined && message.member.roles.includes(guildConfig.music.role);
	}

	public isBannedWord(search: any, guildConfig: any): boolean {
		const globalConfig = this.dyno.globalConfig.music;

		if (!guildConfig.music.bannedEnabled) {
			return false;
		}

		let bannedList = guildConfig.music.bannedWords != undefined ? guildConfig.music.bannedWords : [];

		if (guildConfig.music.globalEnabled && globalConfig != undefined) {
			if (search.type === 'vid' && globalConfig.bannedVideos.includes(search.content)) {
				return true;
			} else if (globalConfig.bannedWords.length > 0) {
				bannedList = bannedList.concat(globalConfig.bannedWords);
			}
		}

		if (guildConfig.music.bannedVideos && guildConfig.music.bannedVideos.length > 0) {
			if (search.type === 'vid' && guildConfig.music.bannedVideos.includes(search.content)) {
				return true;
			}
		}

		if (bannedList.length === 0) {
			return false;
		}

		bannedList = bannedList.map((w: string) => {
			w = this.utils.regEscape(w);
			return w.replace(/(^\s)/, '(?:^|\\s)').replace(/\s$/, '(?:\\s|$)');
		});

		const regex = new RegExp(bannedList.join('|'), 'gi');
		if (search.content.match(regex)) {
			return true;
		}

		return false;
	}

	public async voiceChannelJoin({ member, channel, guild, guildConfig }: VoiceJoinEvent): Promise<void> {
		if (!this.dyno.isReady || !guildConfig.isPremium || member.bot) {
			return;
		}

		if (guildConfig.music != undefined && guildConfig.music.autojoinChannel != undefined) {
			if (channel.id !== guildConfig.music.autojoinChannel) {
				return;
			}

			const queue = await this.getQueue(guild.id);
			if (queue.length === 0) {
				return;
			}

			const voiceChannel = this.client.getChannel(guildConfig.music.autojoinChannel);
			const textChannel = this.client.getChannel(guildConfig.music.channel);

			if (voiceChannel == undefined || textChannel == undefined) {
				return;
			}

			try {
				const player = await this.join(voiceChannel, textChannel, guildConfig);
				player.play(guildConfig).catch(() => null);
			} catch (err) {
				this.logger.error(err);
				return;
			}
		}
	}

	public async voiceChannelSwitch(event: VoiceSwitchEvent): Promise<void> {
		this.voiceChannelJoin(event).catch(() => null);
	}

	public async toggleRepeat(message: eris.Message, guildConfig: any): Promise<any> {
		const guild = (<eris.GuildChannel>message.channel).guild;
		guildConfig.music = guildConfig.music != undefined ? guildConfig.music : {};
		guildConfig.music.repeat = !guildConfig.music.repeat;

		try {
			await this.dyno.guilds.update(guild.id, { $set: { 'music.repeat': guildConfig.music.repeat } });
		} catch (err) {
			this.logger.error(err, {
				type: 'music.toggleRepeat.update',
				guild: guild.id,
				shard: guild.shard.id,
			});

			return Promise.reject('Something went wrong.');
		}

		return Promise.resolve(guildConfig.music.repeat ? 'Repeat enabled' : 'Repeat disabled');
	}

	public async join(vChannel: ErisChannel, tChannel: ErisChannel, guildConfig: dyno.GuildConfig): Promise<Player> {
		const guild = vChannel.guild;
		const player = new Player(this.dyno, this, {
			guild: guild,
			guildConfig: guildConfig,
			textChannel: tChannel,
			voiceChannel: vChannel,
			version: this.version,
		});

		this.dyno.players.set(guild.id, player);

		try {
			await player.connect();
		} catch (err) {
			throw err;
		}

		return player;
	}

	public getPlayer(guild: eris.Guild): Player {
		return this.dyno.players.get(guild.id);
	}

	public deletePlayer(guild: eris.Guild): void {
		if (this.dyno.players.has(guild.id)) {
			this.dyno.players.delete(guild.id);
		}
		if (this.queues.has(guild.id)) {
			this.queues.delete(guild.id);
		}
	}

	public async getQueue(guildId: string): Promise<Queue> {
		const player = this.dyno.players.get(guildId);
		if (player) {
			if (!player.queue) {
				await player.getQueue();
			}
			return player.queue;
		}

		if (this.queues.has(guildId)) {
			return this.queues.get(guildId);
		}

		const guild = this.client.guilds.get(guildId);
		const queue = new Queue(this.dyno, guild);
		try {
			await queue.getQueue();
		} catch (err) {
			this.logger.error(err);
			return;
		}

		this.queues.set(guildId, queue);

		setTimeout(() => {
			this.queues.delete(guildId);
		}, 60000);

		return this.queues.get(guildId);
	}

	public async setVolume(message: eris.Message, volume: number): Promise<boolean> {
		const guild = (<eris.GuildChannel>message.channel).guild;

		const guildConfig = await this.dyno.guilds.getOrFetch(guild.id);
		if (!guildConfig) {
			return false;
		}

		const newVolume = volume * 1.5;

		guildConfig.music = guildConfig.music || {};
		guildConfig.music.volume = newVolume;

		this.dyno.guilds.update(guild.id, { $set: { 'music.volume': guildConfig.music.volume } })
			.catch(() => null);

		const player = this.getPlayer(guild);

		if (player == undefined) {
			return true;
		}

		player.setVolume(newVolume);
		return true;
	}

	public async getVolume(guild: eris.Guild): Promise<number> {
		const guildConfig = await this.dyno.guilds.getOrFetch(guild.id);
		if (!guildConfig) {
			return 150;
		}

		guildConfig.music = guildConfig.music || {};
		return guildConfig.music.volume || 150;
	}

	private updateStats(): void {
		this.lavalink.updateStats();

		const clusterId = this.dyno.options.clusterId.toString();
		const players = this.client.voiceConnections.size;
		const playing = [...this.client.voiceConnections.values()].filter((c: any) => c.playing);
		const state = this.config.state;
		const playingCount = playing.length > 0 ? playing.length : 0;

		this.statsd.gauge(`voice.total.${state}.${clusterId}`, players);
		this.statsd.gauge(`voice.playing.${state}.${clusterId}`, playingCount);

		const key = `dyno:vc:${this.config.client.id}`;
		this.redis.hset(key, `${this.cluster.clusterId}:${this.config.state}`, playingCount).catch(() => null);
	}

	private connectionCheck(): void {
		const voicePlayers = this.client.voiceConnections;
		if (voicePlayers.size === 0) {
			return;
		}

		each([...voicePlayers.values()], (voicePlayer: any) => {
			let channel;

			try {
				channel = this.client.getChannel(voicePlayer.channelId);
			} catch (err) {
				this.logger.error(err, {
					type: 'music.checkConnections.getChannel',
					guildId: voicePlayer.guildId,
				});
			}

			if (channel == undefined) {
				return;
			}

			if (!this.dyno.players.has(voicePlayer.guildId)) {
				voicePlayer.stop();
				voicePlayer.disconnect();
				return;
			}

			const player = this.dyno.players.get(voicePlayer.guildId);

			if (!voicePlayer.playing) {
				player.stop(true);
				return;
			}

			const voiceMembers = channel.voiceMembers.filter((m: eris.Member) => !m.bot);
			if (voiceMembers.size === 0 && channel.voiceMembers.has(this.client.user.id)) {
				player.stop(true);
			}
		});
	}
}

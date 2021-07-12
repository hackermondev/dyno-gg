/**
 * Created by Julian & NoobLance on 25.05.2017.
 */
import * as eris from '@dyno.gg/eris';
import {EventEmitter} from 'eventemitter3';
import LavalinkNode from './LavalinkNode';
import PlayerManager from './PlayerManager';
import Queue from './Queue';

/**
 * Represents a player connection to a lavalink node
 * @class Player
 * @extends EventEmitter
 */
export default class Player extends EventEmitter {
	public id        : string;
	public node      : LavalinkNode;
	public hostname  : string;
	public guildId   : string;
	public channelId : string;
	public sessionId : string;
	public manager   : PlayerManager;
	public options   : any;
	public ready     : boolean = false;
	public playing   : boolean = false;
	public shard     : eris.Shard;
	public state     : PlayerState;
	public track     : string  = null;
	public sendQueue : Queue;
	public timestamp : number;

	/**
	 * Player constructor
	 * @param {string} id Guild ID
	 * @param {Object} data Player data
	 * @param {string} data.channelId The channel id of the player
	 * @param {string} data.guildId The guild id of the player
	 * @param {string} data.hostname The hostname of the lavalink node
	 * @param {PlayerManager} data.manager The PlayerManager associated with this player
	 * @param {Lavalink} data.node The Lavalink node associated with this player
	 * @param {Shard} data.shard The eris shard associated with this player
	 * @param {Object} [data.options] Additional passed from the user to the player
	 */
	constructor(id: string, data: PlayerData) {
		super();
		this.id = id;
		this.node = data.node;
		this.hostname = data.hostname;
		this.guildId = data.guildId;
		this.channelId = data.channelId;
		this.manager = data.manager || null;
		this.options = data.options;
		this.shard = data.shard;
		this.timestamp = Date.now();
		this.sendQueue = new Queue(50, 1);
	}

	/**
	 * Update voice server on the Lavalink node
	 * @param data The data used to connect
	 * @param data.guildId The guild ID to connect
	 * @param data.sessionId The voice connection session ID
	 * @param data.event The event data from the voice server update
	 */
	public voiceUpdate(data: any): void {
		this.sendQueue.add(this.sendEvent.bind(this, {
			op: 'voiceUpdate',
			guildId: data.guildId,
			sessionId: data.sessionId,
			event: data.event,
		}));

		process.nextTick(() => this.emit('ready'));
	}

	/**
	 * Disconnect from Lavalink
	 * @param [message] An optional disconnect message
	 */
	public disconnect(message?: string): void {
		this.playing = false;
		this.sendQueue.add(this.sendEvent.bind(this, { op: 'disconnect', guildId: this.guildId }));
		this.emit('disconnect', message);
	}

	/**
	 * Play a Lavalink track
	 * @param track The track to play
	 * @param [options] Optional options to send
	 */
	public play(track: string, options: PlayOptions): void {
		this.track = track;

		if (this.node.draining) {
			this.state.position = 0;
			this.manager.switchNode(this);
			return;
		}

		const payload: PlayEvent = Object.assign({
			op: 'play',
			guildId: this.guildId,
			track: track,
		}, options);

		this.sendQueue.add(this.sendEvent.bind(this, payload));
		this.playing = true;
		this.timestamp = Date.now();
	}

	/**
	 * Stop playing
	 */
	public stop(): void {
		this.sendQueue.add(this.sendEvent.bind(this, {
			op: 'stop',
			guildId: this.guildId,
		}));

		this.playing = false;
	}

	/**
	 * Update player state
	 * @param {Object} state The state object received from Lavalink
	 * @private
	 */
	public stateUpdate(state: PlayerState): void {
		this.state = state;
	}

	/**
	 * Used to pause/resume the player
	 * @param {boolean} pause Set pause to true/false
	 */
	public setPause(pause: boolean): void {
		this.node.send({
			op: 'pause',
			guildId: this.guildId,
			pause: pause,
		});
	}

	/**
	 * Used for seeking to a track position
	 * @param {number} position The position to seek to
	 */
	public seek(position: number): void {
		this.node.send({
			op: 'seek',
			guildId: this.guildId,
			position: position,
		});
	}

	/**
	 * Set the volume of the player
	 * @param {number} volume The volume level to set
	 */
	public setVolume(volume: number): void {
		this.node.send({
			op: 'volume',
			guildId: this.guildId,
			volume: volume,
		});
	}

	/**
	 * Called on track end
	 * @param {Object} message The end reason
	 * @private
	 */
	public onTrackEnd(event: TrackEndEvent): void {
		if (event.reason == undefined || event.reason !== 'REPLACED') {
			this.playing = false;
		}
		this.emit('end', event);
	}

	/**
	 * Called on track exception
	 * @param {Object} event The exception encountered
	 * @private
	 */
	public onTrackException(event: TrackExceptionEvent) {
		this.emit('error', event);
	}

	/**
	 * Called on track stuck
	 * @param {Object} event The event if exists
	 * @private
	 */
	public onTrackStuck(event: TrackStuckEvent) {
		this.stop();
		process.nextTick(() => this.emit('end', event));
	}

	/**
	 * Switch voice channel
	 * @param {string} channelId Called when switching channels
	 * @param {boolean} [reactive] Used if you want the bot to switch channels
	 */
	public switchChannel(channelId: string, reactive?: boolean) {
		if (this.channelId === channelId) {
			return;
		}

		this.channelId = channelId;
		if (reactive === true) {
			this.updateVoiceState(channelId);
		}
	}

	public getTimestamp() {
		return Date.now() - this.timestamp;
	}

	/**
	 * Update the bot's voice state
	 * @param selfMute Whether the bot muted itself or not (audio sending is unaffected)
	 * @param selfDeaf Whether the bot deafened itself or not (audio receiving is unaffected)
	 */
	public updateVoiceState(channelId: string, selfMute?: boolean, selfDeaf?: boolean) {
		if (this.shard.sendWS) {
			this.shard.sendWS(eris.Constants.GatewayOPCodes.VOICE_STATE_UPDATE, {
				guild_id: this.id,
				channel_id: channelId != undefined ? channelId : null,
				self_mute: selfMute ? selfMute : false,
				self_deaf: selfDeaf ? selfMute : false,
			});
		}
	}

	/**
	 * Send a payload to Lavalink
	 * @param data The payload to send
	 */
	public async sendEvent(data: any) {
		this.node.send(data);
	}
}

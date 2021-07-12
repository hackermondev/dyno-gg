/**
 * Created by Julian & NoobLance on 25.05.2017.
 * DISCLAIMER: We reuse some eris code
 */
import * as eris from '@dyno.gg/eris';
import LavalinkNode from './LavalinkNode';
import Player from './Player';
import Queue from './Queue';

const {Collection, Constants} = eris;

// const Lavalink = require('./Lavalink');
// const Player = require('./Player');
// const { Collection, Constants } = require('eris');

/**
 * Drop in Replacement for the eris voice connection manager
 * @class PlayerManager
 * @extends Collection
 */
export default class PlayerManager extends eris.Collection<Player> {
	public nodes: eris.Collection<LavalinkNode> = new Collection(LavalinkNode);
	public options: ManagerOptions = {};
	public defaultRegions: RegionConfig;
	public regions: RegionConfig;

	private client: eris.Client;
	private failoverQueue: Queue;
	private pendingGuilds: PendingGuilds = {};
	private shardReadyListener: Function;

	/**
	 * PlayerManager constructor
	 * @param client Eris client
	 * @param nodes The Lavalink nodes to connect to
	 * @param options Setup options
	 * @param options.defaultRegion The default region
	 * @param options.failoverRate=250 Failover rate in ms
	 * @param options.failoverLimit=1 Number of connections to failover per rate limit
	 * @param options.player Optional Player class to replace the default Player
	 * @param options.reconnectThreshold=2000 The amount of time to skip ahead in a song when reconnecting in ms
	 * @param options.regions Region mapping object
	 */
	constructor(client: eris.Client, nodes: NodeConfig[], options?: ManagerOptions) {
		super(options.player || Player);

		this.client = client;
		this.options = options;

		this.failoverQueue = new Queue(options.failoverRate, options.failoverLimit);

		this.defaultRegions = {
			asia: ['hongkong', 'singapore', 'sydney'],
			eu: ['eu', 'amsterdam', 'frankfurt', 'russia'],
			us: ['us', 'brazil'],
		};

		this.regions = options.regions || this.defaultRegions;

		for (const node of nodes) {
			this.createNode(Object.assign({}, node, options));
		}

		this.shardReadyListener = this.shardReady.bind(this);
		this.client.on('shardReady', this.shardReadyListener);
	}

	/**
	 * Create a Lavalink node
	 * @param options Lavalink node options
	 * @param options.host The hostname to connect to
	 * @param options.port The port to connect with
	 * @param options.region The region of the node
	 * @param options.numShards The number of shards the bot is running
	 * @param options.userId The user id of the bot
	 * @param options.password The password for the Lavalink node
	 */
	public createNode(options: NodeConfig): void {
		const node = new LavalinkNode({
			host: options.host,
			port: options.port,
			region: options.region,
			numShards: options.numShards,
			userId: options.userId,
			password: options.password,
		});

		node.on('error', this.onError.bind(this, node));
		node.on('disconnect', this.onDisconnect.bind(this, node));
		node.on('message', this.onMessage.bind(this, node));

		this.nodes.set(options.host, node);
	}

	/**
	 * Remove a Lavalink node
	 * @param host The hostname of the node
	 */
	public removeNode(host: string): void {
		const node = this.nodes.get(host);
		if (host == undefined) {
			return;
		}

		node.destroy();
		this.nodes.delete(host);
		this.onDisconnect(node);
	}

	/**
	 * Called when an error is received from a Lavalink node
	 * @param node The Lavalink node
	 * @param err The error received
	 * @private
	 */
	public onError(node: LavalinkNode, err: string): void {
		this.client.emit(err);
	}

	/**
	 * Called when a node disconnects
	 * @param node The Lavalink node
	 * @param msg The disconnect message if sent
	 * @private
	 */
	public onDisconnect(node: LavalinkNode, msg?: string): void {
		const players = this.filter((player: Player) => player.node.host === node.host);
		for (const player of players) {
			this.failoverQueue.add(this.switchNode.bind(this, player, true));
		}
	}

	/**
	 * Called when a shard readies
	 * @param {number} id Shard ID
	 * @private
	 */
	public shardReady(id: number): void {
		const players = this.filter((player: Player) => player.shard != undefined && player.shard.id === id);
		for (const player of players) {
			this.failoverQueue.add(this.switchNode.bind(this, player));
		}
	}

	/**
	 * Switch the voice node of a player
	 * @param {Player} player The Player instance
	 * @param {boolean} leave Whether to leave the channel or not on our side
	 */
	public switchNode(player: Player, leave?: boolean): void {
		const { guildId, channelId, track } = player;
		const position = (player.state.position || 0) + (this.options.reconnectThreshold || 2000);

		const listeners = player.listeners('end');
		const endListeners = [];

		if (listeners != undefined && listeners.length > 0) {
			for (const listener of listeners) {
				endListeners.push(listener);
				player.removeListener('end', listener);
			}
		}

		player.once('end', () => {
			for (const listener of endListeners) {
				player.on('end', listener);
			}
		});

		this.delete(guildId);

		player.playing = false;

		if (leave) {
			player.updateVoiceState(null);
		} else {
			player.node.send({ op: 'disconnect', guildId: guildId });
		}

		process.nextTick(() => {
			this.join(guildId, channelId, null, player).then((newPlayer: Player) => {
				newPlayer.play(track, { startTime: position });
				newPlayer.emit('reconnect');
				this.set(guildId, newPlayer);
			})
			.catch((err: Error) => {
				player.emit('disconnect', err);
				player.disconnect();
			});
		});
	}

	/**
	 * Called when a message is received from the voice node
	 * @param {Lavalink} node The Lavalink node
	 * @param {*} message The message received
	 * @private
	 */
	public onMessage(node: LavalinkNode, message: LavalinkEvent): void {
		switch (message.op) {
			case 'validationReq': {
				const payload: LavalinkEvent = {
					op: 'validationRes',
					guildId: message.guildId,
					valid: false,
				};

				if (message.channelId != undefined && message.channelId.length > 0) {
					const voiceChannel = this.client.getChannel(message.channelId);
					if (voiceChannel != undefined) {
						payload.channelId = voiceChannel.id;
						payload.valid = true;
					}
				} else {
					payload.valid = true;
				}

				node.send(payload);
				return;
			}
			case 'isConnectedReq': {
				const payload: LavalinkEvent = {
					op: 'isConnectedRes',
					shardId: message.shardId,
					connected: false,
				};

				const shard = this.client.shards.get(payload.shardId);
				if (shard != undefined && shard.status === 'connected') {
					payload.connected = true;
				}

				node.send(payload);
				return;
			}
			case 'sendWS': {
				const shard = this.client.shards.get(message.shardId);
				if (shard == undefined) {
					return;
				}

				const payload = JSON.parse(message.message);

				shard.sendWS(payload.op, payload.d);

				if (payload.op === 4 && payload.d.channel_id === null) {
					this.delete(payload.d.guild_id);
				}
			}
			case 'playerUpdate': {
				const player = this.get(message.guildId);
				if (player == undefined) {
					return;
				}

				player.stateUpdate(message.state);
				return;
			}
			case 'event': {
				const player = this.get(message.guildId);
				if (player == undefined) {
					return;
				}

				switch (message.type) {
					case 'TrackEndEvent':
						player.onTrackEnd(<TrackEndEvent>message);
						return;
					case 'TrackExceptionEvent':
						player.onTrackException(<TrackExceptionEvent>message);
						return;
					case 'TrackStuckEvent':
						player.onTrackStuck(<TrackStuckEvent>message);
						return;
					default:
						player.emit('warn', `Unexpected event type: ${message.type}`);
						return;
				}
			}
			case 'stats':
				break;
			default:
				console.error(`Unknown op ${message.op} from Lavalink.`);
		}
	}

	/**
	 * Join a voice channel
	 * @param {string} guildId The guild ID
	 * @param {string} channelId The channel ID
	 * @param {Object} options Join options
	 * @param {Player} [player] Optionally pass an existing player
	 * @returns {Promise<Player>}
	 */
	public async join(guildId: string, channelId: string, options?: JoinOptions, player?: Player): Promise<any> {
		options = options != undefined ? options : {};

		player = player || this.get(guildId);
		if (player != undefined && player.channelId !== channelId) {
			player.switchChannel(channelId);
			return Promise.resolve(player);
		}

		const region = this.getRegionFromData(options.region || 'us');
		const node = await this.findIdealNode(region);

		if (node == undefined) {
			return Promise.reject('No available voice nodes.');
		}

		return new Promise((res: any, rej: any) => {
			this.pendingGuilds[guildId] = {
				channelId: channelId,
				options: options,
				player: player || null,
				node: node,
				hostname: node.host,
				res: res,
				rej: rej,
				timeout: setTimeout(() => {
					node.send({ op: 'disconnect', guildId: guildId });
					delete this.pendingGuilds[guildId];
					rej(new Error('Voice connection timeout'));
				}, 10000),
			};

			node.send({
				op: 'connect',
				guildId: guildId,
				channelId: channelId,
			});
		});
	}

	/**
	 * Leave a voice channel
	 * @param guildId The guild ID
	 */
	public async leave(guildId: string): Promise<void> {
		const player = this.get(guildId);
		if (player == undefined) {
			return;
		}
		player.disconnect();
		this.delete(player.guildId);
	}

	/**
	 * Called by eris when a voice server update is received
	 * @param data The voice server update from eris
	 * @private
	 */
	public async voiceServerUpdate(data: any): Promise<void> {
		let disconnectHandler;
		let readyHandler;

		if (this.pendingGuilds[data.guild_id] && this.pendingGuilds[data.guild_id].timeout) {
			clearTimeout(this.pendingGuilds[data.guild_id].timeout);
			this.pendingGuilds[data.guild_id].timeout = null;
		}

		let player = this.get(data.guild_id);
		if (!player) {
			if (!this.pendingGuilds[data.guild_id]) {
				return;
			}

			player = this.pendingGuilds[data.guild_id].player;

			if (player) {
				player.sessionId = data.sessionId;
				player.hostname = this.pendingGuilds[data.guild_id].hostname;
				player.node = this.pendingGuilds[data.guild_id].node;
				this.set(data.guild_id, player);
			}

			player = player || this.add(new this.baseObject(data.guild_id, {
				shard: data.shard,
				guildId: data.guild_id,
				sessionId: data.session_id,
				channelId: this.pendingGuilds[data.guild_id].channelId,
				hostname: this.pendingGuilds[data.guild_id].hostname,
				node: this.pendingGuilds[data.guild_id].node,
				options: this.pendingGuilds[data.guild_id].options,
				event: data,
				manager: this,
			}));

			player.once('ready', readyHandler).once('disconnect', disconnectHandler);
		}

		player.voiceUpdate({
			sessionId: data.session_id,
			guildId: data.guild_id,
			event: {
				endpoint: data.endpoint,
				guild_id: data.guild_id,
				token: data.token,
			},
		});

		readyHandler = () => {
			player = this.get(data.guild_id);
			if (!this.pendingGuilds[data.guild_id]) {
				if (player) {
					player.removeListener('disconnect', disconnectHandler);
				}
				return;
			}
			player.removeListener('disconnect', disconnectHandler);
			this.pendingGuilds[data.guild_id].res(player);
			delete this.pendingGuilds[data.guild_id];
		};

		disconnectHandler = () => {
			player = this.get(data.guild_id);
			if (!this.pendingGuilds[data.guild_id]) {
				if (player) {
					player.removeListener('ready', readyHandler);
				}
				return;
			}
			player.removeListener('ready', readyHandler);
			this.pendingGuilds[data.guild_id].rej(new Error('Disconnected'));
			delete this.pendingGuilds[data.guild_id];
		};
	}

	/**
	 * Find the ideal voice node based on load and region
	 * @param {string} region Guild region
	 * @private
	 */
	private async findIdealNode(region: string): Promise<LavalinkNode> {
		let nodes = [...this.nodes.values()].filter((node: LavalinkNode) => !node.draining && node.ws && node.connected);

		if (region != undefined) {
			const regionalNodes = nodes.filter((node: LavalinkNode) => node.region === region);
			if (regionalNodes && regionalNodes.length) {
				nodes = regionalNodes;
			}
		}

		nodes = nodes.sort((a: LavalinkNode, b: LavalinkNode) => {
			const aload = a.stats.cpu ? (a.stats.cpu.systemLoad / a.stats.cpu.cores) * 100 : 0;
			const bload = b.stats.cpu ? (b.stats.cpu.systemLoad / b.stats.cpu.cores) * 100 : 0;
			return aload - bload;
		});
		return nodes[0];
	}

	/**
	 * Get ideal region from data
	 * @param {string} endpoint Endpoint or region
	 * @private
	 */
	private getRegionFromData(endpoint?: string): string {
		if (endpoint == undefined) {
			return this.options.defaultRegion || 'us';
		}

		endpoint = endpoint.replace('vip-', '');

		for (const key of Object.keys(this.regions)) {
			const nodes = this.nodes.filter((n: LavalinkNode) => n.region === key);
			if (nodes != undefined || nodes.length === 0) {
				continue;
			}
			if (nodes.find((n: LavalinkNode) => n.connected && !n.draining) != undefined) {
				continue;
			}
			for (const region of this.regions[key]) {
				if (endpoint.startsWith(region)) {
					return key;
				}
			}
		}

		return this.options.defaultRegion || 'us';
	}
}

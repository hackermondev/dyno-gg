import {EventEmitter} from 'eventemitter3';
import * as WebSocket from 'ws';

/**
 * Lavalink node connection
 * @class LavalinkNode
 * @extends EventEmitter
 */
export default class LavalinkNode extends EventEmitter {
	public id                  : string;
	public ws                  : WebSocket;
	public host                : string;
	public port                : number = 80;
	public address             : string;
	public region              : string;
	public userId              : string;
	public numShards           : number;
	public password            : string;
	public disconnectHandler   : Function;
	public reconnectInterval   : NodeJS.Timer;
	public connected           : boolean       = false;
	public draining            : boolean       = false;
	public retries             : number        = 0;
	public reconnectTimeout    : number        = 5000;
	public stats               : LavalinkStats = {};
	public playerPenalty       : number        = 0;
	public cpuPenalty          : number        = 0;
	public deficitFramePenalty : number        = 0;
	public nullFramePenalty    : number        = 0;

	/**
	 * Lavalink constructor
	 * @param {Object} options Lavalink node options
	 * @param {string} options.host The hostname to connect to
	 * @param {string} options.port The port to connect with
	 * @param {string} options.region The region of the node
	 * @param {number} options.numShards The number of shards the bot is running
	 * @param {string} options.userId The user id of the bot
	 * @param {string} options.password The password for the Lavalink node
	 * @param {number} [options.timeout=5000] Optional timeout in ms used for the reconnect backoff
	 */
	constructor(options: LavalinkOptions) {
		super();

		this.host = options.host;
		this.port = options.port || 80;
		this.address = `ws://${this.host}:${this.port}`;
		this.region = options.region || null;
		this.userId = options.userId;
		this.numShards = options.numShards;
		this.password = options.password || 'youshallnotpass';
		this.reconnectTimeout = options.timeout || 5000;
		this.reconnectInterval = null;
		this.disconnectHandler = this.disconnected.bind(this);

		this.connect();
	}

	/**
	 * Get the retry interval
	 */
	protected get retryInterval(): number {
		const retries = Math.min(this.retries - 1, 5);
		return Math.pow(retries + 5, 2) * 1000;
	}

	public updatePenalties(): void {
		if (this.stats.playingPlayers === undefined) {
			return;
		}

		// This will serve as a rule of thumb. 1 playing player = 1 penalty point
		this.playerPenalty = this.stats.playingPlayers;

		// https://fred.moe/293.png
		this.cpuPenalty = Math.pow(1.05, 100 * this.stats.cpu.systemLoad) * 10 - 10;

		// Means we don't have any frame stats. This is normal for very young nodes
		if (this.stats.frameStats.deficit == -1) {
			return;
		}

		// https://fred.moe/rjD.png
		const nullFramePenalty = (Math.pow(1.03, 500 * (this.stats.frameStats.nulled / 3000)) * 300 - 300);
		this.deficitFramePenalty = (Math.pow(1.03, 500 * (this.stats.frameStats.deficit / 3000)) * 300 - 300);
		this.nullFramePenalty *= 2;

		// Deficit frames are better than null frames, as deficit frames can be caused by the garbage collector
	}

	/**
	 * Connect to the websocket server
	 */
	public connect(): void {
		this.ws = new WebSocket(this.address, {
			headers: {
				Authorization: this.password,
				'Num-Shards': this.numShards,
				'User-Id': this.userId,
			},
		});

		this.ws.on('open', this.ready.bind(this));
		this.ws.on('message', this.onMessage.bind(this));
		this.ws.on('close', this.disconnectHandler);
		this.ws.on('error', (err: Error) => {
			this.emit('error', err);
		});
	}

	/**
	 * Reconnect to the websocket
	 * @private
	 */
	public reconnect(): void {
		const interval = this.retryInterval;
		this.reconnectInterval = setTimeout(this.reconnect.bind(this), interval);
		this.retries = this.retries + 1;
		this.connect();
	}

	/**
	 * Destroy the websocket connection
	 */
	public destroy(): void {
		if (this.ws !== undefined) {
			this.ws.removeListener('close', this.disconnectHandler);
			this.ws.close();
		}
	}

	/**
	 * Called when the websocket is open
	 */
	public ready(): void {
		if (this.reconnectInterval != undefined) {
			clearTimeout(this.reconnectInterval);
			this.reconnectInterval = null;
		}

		this.connected = true;
		this.retries = 0;
		this.emit('ready');
	}

	/**
	 * Called when the websocket disconnects
	 */
	public disconnected(): void {
		this.connected = false;
		delete this.ws;

		if (this.reconnectInterval == undefined) {
			this.emit('disconnect');
			this.reconnectInterval = setTimeout(this.reconnect.bind(this), this.reconnectTimeout);
		}
	}

	/**
	 * Send data to Lavalink
	 * @param data Data to send
	 */
	public send(data: any): boolean {
		const ws = this.ws;
		if (ws == undefined) {
			return;
		}

		let payload;

		try {
			payload = JSON.stringify(data);
		} catch (err) {
			return this.emit('error', 'Unable to stringify payload.');
		}

		ws.send(payload);
	}

	/**
	 * Handle message from the server
	 * @param {string} message Raw websocket message
	 * @private
	 */
	public onMessage(message: any): void {
		let data;

		try {
			data = JSON.parse(message);
		} catch (e) {
			this.emit('error', 'Unable to parse ws message.');
			return;
		}

		if (data.op != undefined && data.op === 'stats') {
			this.stats = data;
		}

		this.emit('message', data);
	}
}

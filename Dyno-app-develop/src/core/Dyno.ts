import * as core from '@dyno.gg/dyno-core';
import * as Eris from '@dyno.gg/eris';
import * as each from 'async-each';
import * as StatsD from 'hot-shots';
import * as moment from 'moment';
import config from './config';
import {logger} from './logger';
import {default as models} from './models';
import {default as redis} from './redis';
import {default as statsd} from './statsd';

import CommandCollection from './collections/CommandCollection';
import GuildCollection from './collections/GuildCollection';
import ModuleCollection from './collections/ModuleCollection';
import Dispatcher from './Dispatcher';
import PermissionsManager from './PermissionsManager';

const utils = new core.Utils();

var instance;

/**
 * @class Dyno
 */
export default class Dyno {
	public isReady: boolean = false;
	public options: any;
	private _client: Eris.Client;
	private _langs: core.LangManager;
	private _globalConfig: GlobalConfig;
	private _restClient: Eris.Client;
	private _wsStatus: number = Date.now();

	/**
	 * Dyno constructor
	 */
	constructor() {
		instance = this; // eslint-disable-line

		Object.defineProperty(Eris.Message.prototype, 'guild', {
			get: function get() { return this.channel.guild; },
		});

		process.on('unhandledRejection', this.handleRejection.bind(this));
	}

	static get instance() {
		return instance;
	}

	/**
	 * Eris client instance
	 * @returns {Eris}
	 */
	get client() {
		return this._client;
	}

	/**
	 * Eris rest client instance
	 * @return {Eris}
	 */
	get restClient() {
		return this._restClient;
	}

	/**
	 * Dyno configuration
	 * @returns {Object}
	 */
	get config() {
		return config;
	}

	/**
	 * Global configuration
	 * @return {Object}
	 */
	get globalConfig() {
		return this._globalConfig;
	}

	get langs() {
		return this._langs;
	}

	get t() {
		return this._langs.t;
	}

	get logger() {
		return logger;
	}

	get models() {
		return models;
	}

	get redis() {
		return redis;
	}

	get statsd() {
		return statsd;
	}

	get utils() {
		return utils;
	}

	get prefix() {
		return (config.prefix != undefined && typeof config.prefix === 'string') ? config.prefix : '?';
	}

	public handleError(err: any) {
		if (!err || (typeof err === 'string' && !err.length)) {
			return logger.error('An undefined exception occurred.');
		}

		try {
			logger.error(err);
		} catch (e) {
			console.error(err); // eslint-disable-line
		}
	}

	/**
	 * Unhandled rejection handler
	 */
	public handleRejection(reason: any, p: any) {
		try {
			console.error('Unhandled rejection at: Promise ', p, 'reason: ', reason); // eslint-disable-line
		} catch (err) {
			console.error(reason); // eslint-disable-line
		}
	}

	/**
	 * Setup Dyno and login
	 */
	public async setup(options: any) {
		options = options || {};

		await this.configure(options);
		setInterval(this.loadConfig.bind(this), 120000);

		options.restClient = { restMode: true };

		this.options = options;

		// create the discord client
		this._client = new Eris(config.client.token, config.clientOptions);
		this._restClient = new Eris(`Bot ${config.client.token}`, options.restClient);

		this.client.on('error', err => logger.error(err));
		this.client.on('warn', err => logger.error(err));
		this.client.on('debug', msg => {
			if (typeof msg === 'string') {
				msg = msg.replace(process.env.CLIENT_TOKEN, 'potato');
			}
			logger.debug(`[Eris] ${msg}`);
		});

		this._langs = new core.LangManager(config.paths.translations);
		this._langs.loadLocales();

		this.dispatcher = new Dispathcer(this);
		this.ipc = new IPCManager(this);

		// Create collections
		this.commands = new CommandCollection(config, this);
		this.modules  = new ModuleCollection(config, this);
		this.guilds   = new GuildCollection(config, this);

		// Create managers
		this.webhooks  = new WebhookManager(this);
		this.permissions = new PermissionsManager(this);

		// event listeners
		this.client.once('ready', this.ready.bind(this));
		this.client.on('error', this.handleError.bind(this));

		if (!config.disableHeartbeat) {
			this.client.on('messageCreate', this.gatewayPing.bind(this));
			setInterval(this.gatewayCheck.bind(this), 60000);
		}

		// login to discord
		this.login();

		this.readyTimeout = setTimeout(() => this.ipc.send('ready'), 90000);
	}

	async configure(options) {
		const clientConfig = {
			disableEvents: {
				TYPING_START: true,
			},
			disableEveryone: config.client.disableEveryone,
			getAllUsers: config.client.fetchAllUsers || false,
			firstShardID: options.firstShardId || options.clusterId || options.shardId || 0,
			lastShardID: options.lastShardId || options.clusterId || options.shardId || 0,
			maxShards: options.shardCount || 1,
			messageLimit: parseInt(config.client.maxCachedMessages) || 10,
			guildCreateTimeout: 3000,
			defaultImageFormat: 'png',
		};

		if (config.disableEvents) {
			for (let event of config.disableEvents) {
				clientConfig.disableEvents[event] = true;
			}
		}

		config.clientOptions = clientConfig;

		await this.loadConfig().catch(() => null);
	}

	async loadConfig() {
		try {
			if (models.Config != undefined) {
				const dbConfig = await models.Config.findOne({ clientId: config.client.id }).lean();
				if (dbConfig) {
					config = Object.assign(config, dbConfig);
				}
			}
			const globalConfig = await models.Dyno.findOne().lean();
			this._globalConfig = globalConfig;
		} catch (err) {
			this.logger.error(err);
		}
	}

	/**
	 * Login to Discord
	 * @returns {*}
	 */
	login() {
		if (!config.client.token || !config.client.token.length) {
			return logger.error('OAuth Token must be set in .env');
		}

		// connect to discord
		this.client.connect();

		return false;
	}

	/**
	 * Ready event handler
	 */
	ready() {
		logger.info(`[Dyno] ${this.config.name} ready with ${this.client.guilds.size} guilds.`);

		// register discord event listeners
		this.dispatcher.bindListeners();

		clearTimeout(this.readyTimeout);
		this.ipc.send('ready');

		this.user = this._client.user;
		this.userid = this._client.user.id;

		this.isReady = true;

		if (this.config.client.game) {
			this.client.editStatus('online', { name: this.config.client.game, type: 0 });
		}

		if (this.config.isPremium) {
			this.leaveInterval = setInterval(this.leaveGuilds.bind(this), 300000);
			this.leaveGuilds();
		}
	}

	/**
	 * Updated the gateway status for this shard
	 */
	gatewayPing() {
		this._wsStatus = Date.now();
	}

	/**
	 * Check the status of the gateway connection and kill the process
	 * if it hasn't received a message in 5 minutes
	 */
	gatewayCheck() {
		const elapsed = (Date.now() - this._wsStatus) / 1000;
		if (elapsed > 900) {
			logger.error(`No message received in 15 minutes on ${this.options.clusterId}`);
		}
	}

	async leaveGuilds() {
		try {
			var docs = await models.Server.find({ deleted: false, isPremium: true }, { _id: 1, isPremium: 1, premiumInstalled: 1 }).lean().exec();
		} catch (err) {
			return logger.error(err);
		}

		each([...this.client.guilds.values()], guild => {
			let guildConfig = docs.find(d => d._id === guild.id);
			if (!guildConfig || !guildConfig.isPremium) {
				this.guilds.update(guild.id, { $set: { premiumInstalled: false } }).catch(err => false);
				this.client.leaveGuild(guild.id);
			}
		});
	}
}

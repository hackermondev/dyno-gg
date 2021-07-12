'use strict';

global.Promise = require('bluebird');

const fs = require('fs');
const path = require('path');
const Eris = require('@dyno.gg/eris');
const {utils} = require('@dyno.gg/dyno-core');
const dot = require('dot-object');
const each = require('async-each');
const StatsD = require('hot-shots');
const moment = require('moment');
const SnowTransfer = require('snowtransfer');
const config = require('./config');
const logger = require('./logger');
const redis = require('./redis');
const db = require('./database');
const PermissionsManager = require('./managers/PermissionsManager');
const CommandCollection = require('./collections/CommandCollection');
const ModuleCollection = require('./collections/ModuleCollection');
const GuildCollection = require('./collections/GuildCollection');
const WebhookManager = require('./managers/WebhookManager');
const EventManager = require('./managers/EventManager');
const IPCManager = require('./managers/IPCManager');

const redisLock = require('ioredis-lock');

var instance;

const statsdClient = new StatsD({
	host: config.get('statsd.host'),
	port: config.get('statsd.port'),
	prefix: config.get('statsd.prefix'),
});

/**
 * @class Dyno
 */
class Dyno {

	/**
	 * Dyno constructor
	 */
	constructor() {
		this.isReady = false;

		instance = this; // eslint-disable-line

		Object.defineProperty(Eris.Message.prototype, 'guild', {
			get: function get() { return this.channel.guild; },
		});

		process.on('unhandledRejection', this.handleRejection.bind(this));
		process.on('uncaughtException', this.crashReport.bind(this));
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

	get logger() {
		return logger;
	}

	get db() {
		return db;
	}

	get models() {
		return db.models;
	}

	get redis() {
		return redis;
	}

	get snowClient() {
		return this._snowClient;
	}

	get statsd() {
		return statsdClient;
	}

	get utils() {
		return utils;
	}

	get prefix() {
		return (config.prefix != undefined && typeof config.prefix === 'string') ? config.prefix : '?';
	}

	handleError(err) {
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
	 * @param {Error|*} reason The reason the promise was rejected
	 * @param {Promise} p The promise that was rejected
	 */
	handleRejection(reason, p) {
		try {
			console.error('Unhandled rejection at: Promise ', p, 'reason: ', reason); // eslint-disable-line
		} catch (err) {
			console.error(reason); // eslint-disable-line
		}
	}

	crashReport(err) {
		const cid = `C${this.clientOptions.clusterId}`;
		const time = (new Date()).toISOString();
		let report = `Crash Report [${cid}] ${time}:\n\n${err.stack}`;

		report += `\n\nClient Options: ${JSON.stringify(this.clientOptions)}`;

		for (let module of this.modules.values()) {
			if (module.crashReport) {
				report += `\n\n${module.crashReport()}`;
			}
		}

		const file = path.join(__dirname, `crashreport_${cid}_${time}.txt`);
		fs.writeFileSync(file, report);

		setTimeout(() => process.exit(), 6000);
	}

	/**
	 * Setup Dyno and login
	 */
	async setup(options, rootContext) {
		options = options || {};

		await this.configure(options);

		options.restClient = { restMode: true };

		this.options = Object.assign({}, { rootCtx: rootContext }, options);
		this.clientOptions = options;

		// create the discord client
		this._client = new Eris(config.client.token, config.clientOptions);
		this._restClient = new Eris(`Bot ${config.client.token}`, options.restClient);

		this._snowClient = new SnowTransfer(config.client.token, {
			baseHost: config.snowgate.host,
		});

		this.client.on('error', err => logger.error(err));
		this.client.on('warn', err => logger.error(err));
		this.client.on('debug', msg => {
			if (typeof msg === 'string') {
				msg = msg.replace(config.client.token, 'potato');
			}
			logger.debug(`[Eris] ${msg}`);
		});

		this.dispatcher = new EventManager(this);
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
			preIdentify: this.preIdentify.bind(this),
		};

		if (config.disableEvents) {
			for (let event of config.disableEvents) {
				clientConfig.disableEvents[event] = true;
			}
		}

		config.clientOptions = clientConfig;

		await this.loadConfig().catch(() => null);

		this.watchGlobal();
	}

	watchGlobal() {
		this._globalWatch = this.models.Dyno.watch();
		this._globalWatch.on('error', async (err) => {
			this.logger.error(err);

			try {
				this._globalWatch.close();
			} catch (err) {
				// pass
			}

			setTimeout(this.watchGlobal.bind(this), 1000);
		});
		this._globalWatch.on('change', this.updateGlobal.bind(this));
	}

	async loadConfig() {
		try {
			if (this.models.Config != undefined) {
				const dbConfig = await this.models.Config.findOne({ clientId: config.client.id }).lean();
				if (dbConfig) {
					config = Object.assign(config, dbConfig);
				}
			}
			const globalConfig = await this.models.Dyno.findOne().lean();
			this._globalConfig = globalConfig;
		} catch (err) {
			this.logger.error(err);
		}
	}

	updateGlobal(change) {
		const globalConfig = this._globalConfig;
		switch (change.operationType) {
			case 'update':
				if (Object.keys(change.updateDescription.updatedFields).length) {
					for (let [key, val] of Object.entries(change.updateDescription.updatedFields)) {
						dot.set(key, val, globalConfig);
					}
				}
				if (change.updateDescription.removedFields.length > 0) {
					for (let field of change.updateDescription.removedFields) {
						dot.remove(field, globalConfig);
					}
				}
				this._globalConfig = globalConfig;
				break;
			case 'replace':
				if (change.fullDocument) {
					this._globalConfig = change.fullDocument;
				}
				break;
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

	preIdentify(identify) {
		const lock = redisLock.createLock(redis, {
			timeout: 5100,
			retries: Number.MAX_SAFE_INTEGER,
			delay: 250,
		});

		return new Promise(resolve => {
			lock.acquire(`shard:identify:${config.client.id}`).then(() => {
				logger.debug(`Acquired lock on ${identify.shard.toString()}`);
				resolve();
			});
		});
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

	async leaveGuilds() {
		try {
			var docs = await this.models.Server.find({ deleted: false, isPremium: true }, { _id: 1, isPremium: 1, premiumInstalled: 1 }).lean().exec();
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

module.exports = Dyno;

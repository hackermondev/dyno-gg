'use strict';

const Eris = require('eris');
const uuidv4 = require('uuid/v4');
const Server = require('./Server');
const config = require('./config');
const logger = require('./logger').get('Client');
const CommandCollection = require('../collections/CommandCollection');
const ModuleCollection = require('../collections/ModuleCollection');
const GuildCollection = require('../collections/GuildCollection');
const { Dyno } = require('./models').models;

class Client {
	constructor() {
		process.on('uncaughtException', this.handleException.bind(this));
		process.on('unhandledRejection', this.handleRejection.bind(this));

		this.server = new Server(config);
		this.reconnectIntervals = {};

		config.state = config.state || (config.beta ? 1 : config.test ? 2 : 0);
		config.uuid = uuidv4();

		this.setup();
	}

	/**
	 * Uncaught exception handler
	 * @param  {Object} err Error object
	 */
	handleException(err) {
		logger.error(err, 'unhandled');
		setTimeout(() => process.exit(), 3000);
	}

	handleRejection(reason, p) {
		logger.error(reason, 'unhandled', {reason, p}); // eslint-disable-line
	}

	async watchGlobal() {
		await this.updateGlobal();

		this._globalConfigInterval = setInterval(() => this.updateGlobal(), 2 * 60 * 1000);
	}

	async updateGlobal() {
		try {
			config.global = await Dyno.findOne().lean();
		} catch (err) {
			logger.error(err, 'globalConfigRefresh');
		}
	}

	async setup() {
		this.client = new Eris(`Bot ${config.client.token}`, { restMode: true });

		await this.watchGlobal();

		// Create collections
		this.commands = config.commands = new CommandCollection();
		this.modules  = config.modules  = new ModuleCollection();
		this.guilds   = config.guilds   = new GuildCollection();

		if (config.prefix) {
			this.prefix = (typeof config.prefix === 'string') ? config.prefix : '?';
		}

		this.user = await this.client.getSelf().catch(err => logger.error(err));

		await this.server.start(this);
	}
}

module.exports = Client;

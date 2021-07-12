'use strict';

const uuid = require('node-uuid');
const SnowTransfer = require('snowtransfer');
const Server = require('./Server');
const config = require('./config');
const logger = require('./logger');
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
		config.uuid = uuid.v4();

		this.setup();
	}

	/**
	 * Uncaught exception handler
	 * @param  {Object} err Error object
	 */
	handleException(err) {
		logger.error(err);
		setTimeout(() => process.exit(), 3000);
	}

	handleRejection(reason, p) {
		console.error('Unhandled rejection at: Promise ', p, 'reason: ', reason); // eslint-disable-line
	}

	async setup() {
		const snowOptions = {
			baseHost: config.snowgate.host,
		};

		this.snowClient = new SnowTransfer(config.snowgate.token, snowOptions);

		await Dyno.findOne().lean()
			.then(doc => { config.global = doc; })
			.catch(err => logger.error(err));

		// Create collections
		this.commands = config.commands = new CommandCollection();
		this.modules  = config.modules  = new ModuleCollection();
		this.guilds   = config.guilds   = new GuildCollection();

		if (config.prefix) {
			this.prefix = (typeof config.prefix === 'string') ? config.prefix : '?';
		}

		this.user = await this.snowClient.user.getSelf().catch(err => logger.error(err));

		await this.server.start(this);
	}
}

module.exports = Client;

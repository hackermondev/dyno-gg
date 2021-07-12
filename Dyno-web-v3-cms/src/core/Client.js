'use strict';

const Eris = require('eris');
const uuid = require('node-uuid');
const Server = require('./Server');
const config = require('./config');
const logger = require('./logger');
const CommandCollection = require('../collections/CommandCollection');
const ModuleCollection = require('../collections/ModuleCollection');
const GuildCollection = require('../collections/GuildCollection');
const { Dyno } = require('./models');

let client;

class Client {
	constructor() {
		process.on('uncaughtException', this.handleException.bind(this));
		process.on('unhandledRejection', this.handleRejection.bind(this));

		this.server = new Server(config);
		this.reconnectIntervals = {};

		config.state = config.beta ? 1 : config.test ? 2 : 0;
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
		const options = {
			restMode: true,
		};

		this.client = client = new Eris(`Bot ${config.client.token}`, options);

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

		// event listeners
		client.on('error', err => logger.error(err));

		client.user = await client.getRESTUser(config.client.userid).catch(err => logger.error(err));

		this.server.start(this);
	}
}

module.exports = Client;

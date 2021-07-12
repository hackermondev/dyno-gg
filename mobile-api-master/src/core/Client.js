const Eris = require('eris');
const Server = require('./Server');
const config = require('./config');
const logger = require('./logger');
const { Dyno } = require('./models');

let client;

class Client {
    constructor() {
        process.on('uncaughtException', this.handleException.bind(this));
        process.on('unhandledRejection', this.handleRejection.bind(this));

        this.server = new Server(config);
        this.reconnectIntervals = {};

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

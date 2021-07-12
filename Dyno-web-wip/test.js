'use strict';

const Eris = require('eris');
const config = require('./config');
const logger = require('./logger');

const options = {
	restMode: true,
};

const client = new Eris(`Bot ${config.client.token}`, options);

client.on('error', err => logger.error(err));

client.getRESTUser(config.client.userid).then(console.log).catch(console.error);


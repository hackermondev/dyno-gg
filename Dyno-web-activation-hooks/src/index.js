'use strict';

global.Promise = require('bluebird');
global.requireReload = require('require-reload');

const Client = require('./core/Client');
const client = new Client(); // eslint-disable-line

// setInterval(() => process.exit(), 3600 * 1000);

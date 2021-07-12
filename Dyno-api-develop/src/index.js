'use strict';

global.Promise = require('bluebird');
global.requireReload = require('require-reload');

const Server = require('./core/Server');
const server = new Server(); // eslint-disable-line

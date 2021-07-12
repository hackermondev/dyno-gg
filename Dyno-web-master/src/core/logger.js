const config = require('./config');
const { init, Logger } = require('@dyno.gg/logger');

init(config);

module.exports = Logger;
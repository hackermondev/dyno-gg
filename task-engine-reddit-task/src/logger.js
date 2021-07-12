const logger = require('@dyno.gg/logger');
const config = require('./config');

module.exports = function(file, env) {
    return logger({
        logLevel: config.logLevel,
        minLogLevel: 'INFO',
        environment: env,
        indexPattern: 'task.',
        elastic: {
            host: config.elasticHost,
        },
    }).get(file);
};

const elasticsearch = require('elasticsearch');

function init({ host, elasticLibLogLevel}) {
    return new elasticsearch.Client({
        host: `${host}`,
        log: elasticLibLogLevel || ['warning', 'error'],
    });
}

module.exports = function elastic(options) {
    return init(options);
};

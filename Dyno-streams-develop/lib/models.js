'use strict';

//const getenv = require('getenv');
const DataFactory = require('@dyno.gg/datafactory');

//require('dotenv').config({ silent: true });

const dbString = require('../config.json').mongo.url;

if (!dbString) {
    throw new Error('Missing environment variable CLIENT_MONGO_URL.');
}

const db = new DataFactory({
    dbString,
    logger: {
        level: 'info',
    },
});

const models = db.models;
models.mongoose = db.mongoose;
models.Schema = db.Schema;

module.exports = models;
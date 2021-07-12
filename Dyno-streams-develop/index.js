'use strict';

const streamService = require('./lib/StreamService.js');

streamService.start();

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at:', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
});

process.on('uncaughtException', (err) => {
    console.log(err);
});
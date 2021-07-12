'use strict';

const fs = require('fs');
const http = require('http');
const https = require('https');
const chalk = require('chalk');

const each = require('async-each');

global.Promise = require('bluebird');
global.requireReload = require('require-reload');
global.Loader = require('./core/utils/Loader');
Loader.setRoot(require);

require.extensions['.txt'] = function (module, filename) {
    module.exports = fs.readFileSync(filename, 'utf8');
};

const logo = require('./logo.txt');

if ((process.env.clusterId || process.env.shardId) && process.env.shardCount) {
	const Dyno = require('./core/Dyno');
	const options = {};
	if (process.env.shardId) {
		options.shardId = parseInt(process.env.shardId);
	}

	if (process.env.clusterId) {
		options.clusterId = parseInt(process.env.clusterId);
	}

	if (process.env.shardCount) {
		options.shardCount = parseInt(process.env.shardCount);
	}

	if (process.env.clusterCount) {
		options.clusterCount = parseInt(process.env.clusterCount);
	}

	if (process.env.firstShardId) {
		options.firstShardId = process.env.firstShardId ? parseInt(process.env.firstShardId) : null;
		options.lastShardId = process.env.lastShardId ? parseInt(process.env.lastShardId) : null;
	}

	options.rootCtx = require;

	if (process.env.ENABLE_LONGJOHN) {
		require('longjohn');
	}

	const dyno = new Dyno();
	dyno.setup(options);
} else {
	printLogo().then(() => {
		const ClusterManager = require('./core/cluster/Manager');
		console.log('Starting Cluster Manager');
		const clusterManager = new ClusterManager(); // eslint-disable-line
	});
}

async function printLogo() {
	let lines = logo.split('\n');
	for (let line of lines) {
		console.log(chalk.blue(line));
		await Promise.delay(30);
	}
	return Promise.resolve();
}

'use strict';

const Controller = require('../core/Controller');
const config = require('../core/config');
const redis = require('../core/redis');
const Client = require('../core/rpc/Client');
const db = require('../core/models');
const logger = require('../core/logger').get('Status');
const axios = require('axios');

/**
 * Status controller
 * @class Status
 * @extends {Controller}
 */
class Status extends Controller {

	/**
	 * Constructor
	 * @returns {Object}
	 */
	constructor(bot) {
		super(bot);

		// define routes
		return {
			status: {
				method: 'get',
				uri: '/status',
				handler: this.index.bind(this),
			},
			staffStatus: {
				method: 'get',
				uri: '/staff/status',
				handler: this.staffStatus.bind(this),
			},
			api: {
				method: 'get',
				uri: '/api/status',
				handler: this.api.bind(this),
			},
			guildStatus: {
				method: 'get',
				uri: '/api/status/:id',
				handler: this.guildStatus.bind(this),
			},
			restart: {
				method: 'post',
				uri: '/api/status/restart',
				handler: this.restart.bind(this),
			},
			connect: {
				method: 'post',
				uri: '/api/status/connect/:id',
				handler: this.connect.bind(this),
			},
		};
	}

	index(bot, req, res) {
		res.locals.scripts.push('/js/react/status.js');
		res.locals.stylesheets.push('/css/status.css');
		res.locals.statusConfig = {
			shardCount: config.global.shardCount,
			shardsPerCluster: config.global.shardsPerCluster,
		};
		return res.render('status');
	}

	staffStatus(bot, req, res) {
		if (!req.session || !req.session.isAdmin) {
			return res.redirect('/');
		}

		res.locals.scripts.push('/js/react/staffStatus.js');
		res.locals.stylesheets.push('/css/status.css');
		res.locals.statusConfig = {
			shardCount: config.global.shardCount,
			shardsPerCluster: config.global.shardsPerCluster,
		};
		return res.render('staffStatus');
	}

	async restart(bot, req, res) {
		if (!req.session || !req.session.isAdmin) {
			return res.status(403).send('Forbidden');
		}

		if (!req.body || !req.body.env || !req.body.id) {
			return res.status(400).send('Invalid request');
		}

		const { env, id } = req.body;

		try {
			const cluster = await this.db.collection('clusters').findOne({ env, id });
			if (!cluster) {
				return res.status(500).send(`Couldn't find cluster ${id} in ${env}`);
			}

			const host = cluster.host.hostname;
			const client = new Client(host, 5052);

			client.request('restart', { id: cluster.id, token: this.config.restartToken });
			return res.send('OK');
		} catch (err) {
			return res.status(500).send(err);
		}
	}

	async connect(bot, req, res) {
		if (!req.session || !req.session.isAdmin) {
			return res.status(403).send('Forbidden');
		}

		if (!req.body || !req.body.env || !req.body.id || !req.body.shardId) {
			return res.status(400).send('Invalid request');
		}

		const { env, id, shardId } = req.body;

		try {
			const cluster = await this.db.collection('clusters').findOne({ env, id });
			if (!cluster) {
				return res.status(500).send(`Couldn't find cluster ${id} in ${env}`);
			}

			const host = cluster.host.hostname;
			const port = 30000 + parseInt(id, 10);
			const client = new Client(host, port);

			await client.request('debug', { token: config.rpcToken, code: `client.shards.get(${shardId}).connect()` });
			return res.send('OK');
		} catch (err) {
			return res.status(500).send(err);
		}
	}

	async api(bot, req, res) {
		const response = {};
		const { environments } = config.global;

		await Promise.all(Object.keys(environments).map(async (key) => {
			const env = environments[key];
			response[key] = {
				name: env.name,
				displayName: env.displayName,
				clusterCount: env.clusterCount,
				shardCount: env.shardCount,
				statuses: [],
			};

			const pipeline = await redis.pipeline();

			for (let i = 0; i < env.clusterCount; i++) {
				pipeline.get(`dyno:status:${env.name}:${i}`);
			}

			const statuses = await pipeline.exec();

			// Results in a pipeline are ordered. We can figure out which command
			// errored out by the order of the results.
			let currentClusterId = 0;
			statuses.forEach((s) => {
				const [err, redisStatus] = s;

				if (err) {
					response[key].statuses.push({ id: currentClusterId.toString(), error: 'Redis call failed.' });
					currentClusterId++;
					return;
				}

				if (redisStatus === null) {
					response[key].statuses.push({ id: currentClusterId.toString(), error: 'Cluster offline.' });
					currentClusterId++;
					return;
				}

				let parsedStatus = JSON.parse(redisStatus);

				if (!req.query.shard_status && parsedStatus.shardStatus) {
					delete parsedStatus.shardStatus;
				}

				if (!req.query.versions && parsedStatus.versions) {
					delete parsedStatus.versions;
				}

				const status = {
					id: parsedStatus.clusterId,
					result: parsedStatus,
				};

				response[key].statuses.push(status);
				currentClusterId++;
			});
		}));

		res.send(response);
	}

	async guildStatus(bot, req, res) {
		try {
			const { environments } = config.global;
			const prodShard = ~~((req.params.id * 1 / 4194304) % environments.prod.shardCount);
			const premShard = ~~((req.params.id * 1 / 4194304) % environments.premium.shardCount);
			const [prodCluster, premCluster, guildConfig] = await Promise.all([
				db.collection('clusters').findOne({ env: 'prod', firstShardId: { $gte: prodShard }, lastShardId: { $lte: prodShard } }),
				db.collection('clusters').findOne({ env: 'premium', firstShardId: { $gte: premShard }, lastShardId: { $lte: premShard } }),
				db.collection('servers').findOne({ _id: req.params.id }, { isPremium: 1, premiumInstalled: 1 }),
			]);

			let status;

			if (guildConfig.isPremium && guildConfig.premiumInstalled) {
				status = await redis.get(`dyno:status:premium:${premCluster.id}`);
				return res.send({
					env: 'premium',
					status: status.shardStatus.find(s => s.id === premShard),
				});
			} else {
				status = await redis.get(`dyno:status:prod:${prodCluster.id}`);
				return res.send({
					env: 'prod',
					status: status.shardStatus.find(s => s.id === prodShard),
				});
			}
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}
}

module.exports = Status;

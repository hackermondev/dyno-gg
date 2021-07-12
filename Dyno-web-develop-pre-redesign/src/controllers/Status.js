'use strict';

const Controller = require('../core/Controller');
const config = require('../core/config');
const redis = require('../core/redis');
const superagent = require('superagent');

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
			api: {
				method: 'get',
				uri: '/api/status',
				handler: this.api.bind(this),
			},
		};
	}

	index(bot, req, res) {
		res.locals.scripts.push('/js/react/status.js');
		res.locals.stylesheets.push('/css/status.css');
		return res.render('status');
	}

	async api(bot, req, res) {
		const response = {};
		const { clustersPerServer, servers } = config;
		await Promise.all(Object.keys(servers).map(async (objectKey) => {
			const server = servers[objectKey];
			response[server.name] = [];

			const pipeline = await redis.pipeline();

			for (let i = 0; i < clustersPerServer; i++) {
				pipeline.get(`dyno.status.${server.state}.${i}`);
			}


			const statuses = await pipeline.exec();

			// Results in a pipeline are ordered. We can figure out which command
			// errored out by the order of the results.
			let currentClusterId = 0;
			statuses.forEach((s) => {
				const [err, redisStatus] = s;

				if (err) {
					response[server.name].push({ id: currentClusterId.toString(), error: 'Redis call failed.' });
					return;
				}

				if (redisStatus === null) {
					response[server.name].push({ id: currentClusterId.toString(), error: 'Cluster offline.' });
					return;
				}

				const parsedStatus = JSON.parse(redisStatus);
				const status = {
					id: parsedStatus.clusterId,
					result: parsedStatus,
				};

				response[server.name].push(status);
				currentClusterId++;
			});
		}));

		res.send(response);
	}
}

module.exports = Status;

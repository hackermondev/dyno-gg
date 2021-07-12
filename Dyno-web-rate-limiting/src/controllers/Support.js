'use strict';

const Controller = require('../core/Controller');
const redis = require('../core/redis');
const logger = require('../core/logger').get('Support');
const { models } = require('../core/models');

/**
 * Support controller
 * @class Support
 * @extends {Controller}
 */
class Support extends Controller {

	/**
	 * Constructor
	 * @returns {Object}
	 */
	constructor(bot) {
		super(bot);

		// define routes
		return {
			cfg: {
				method: 'get',
				uri: '/support/c/:id',
				handler: this.supportConfig.bind(this),
			},
			api: {
				method: 'get',
				uri: '/api/support/c/:id',
				handler: this.api.bind(this),
			},
		};
	}

	async supportConfig(bot, req, res) {
		res.locals.scripts.push('/js/react/support.js');
		return res.render('support/config', { layout: 'server' });
	}

	parseConfig(config, channels, roles) {
		if (typeof config === 'object') {
			for (var keys in config) {
				if (typeof config[keys] === 'object') {
					this.parseConfig(config[keys], channels, roles);
				} else if (typeof config[keys] === 'string' && !isNaN(config[keys]) && config[keys].length > 5) {
					let foundChannel = channels.find(c => c.id === config[keys]);
					let foundRole = roles.find(r => r.id === config[keys]);
					let keyValue = config[keys];

					if (foundChannel) {
						keyValue += ` #${foundChannel.name}`;
					}

					if (foundRole) {
						keyValue += ` ${foundRole.name}`;
					}

					config[keys] = keyValue;
				}
			}
		}
		return config;
	}

	async api(bot, req, res) {
		if (!req.session || !req.session.user) {
			return res.status(403).send('Forbidden');
		}

		try {
			let result = redis.get(`supportcfg:${req.params.id}`);
			if (!result) {
				return res.status(404).send('Config not found.');
			}

			result = JSON.parse(result);

			let [channels, roles] = await Promise.all([
				this.client.getRESTGuildChannels(result.guildId),
				this.client.getRESTGuildRoles(result.guildId),
			]);

			if (req.session.user.id !== result.userId) {
				return res.status(403).send('Forbidden');
			}

			let config = await models.Server.findOne({ _id: result.guildId }).lean().exec();

			let filteredKeys = [
				'dyno',
				'livePrefix',
				'vip',
				'wasBeta',
				'webhooks',
			];

			if (result.excludeKeys) {
				filteredKeys = filteredKeys.concat(result.excludeKeys);
			}

			for (let key of filteredKeys) {
				delete config[key];
			}

			config = this.parseConfig(config, channels, roles);

			return res.send({ config });
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}
}

module.exports = Support;

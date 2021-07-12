'use strict';

const Controller = require('../core/Controller');
const redis = require('../core/redis');
const logger = require('../core/logger').get('Support');
const db = require('../core/models');
const { models } = db;

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
			let result = await redis.get(`supportcfg:${req.params.id}`);
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

			let [config, tags, automessages, autopurges, reddits, embeds] = await Promise.all([
				models.Server.findOne({ _id: result.guildId }).lean(),
				models.Tag.find({ guild: result.guildId }).lean(),
				db.collection('automessages').find({ guild: result.guildId }, { projection: { webhook: 0 }}).toArray(),
				db.collection('autopurges').find({ guild: result.guildId }).toArray(),
				db.collection('reddits').find({ guildId: result.guildId }, { projection: { webhookId: 0, webhookToken: 0 }}).toArray(),
				models.MessageEmbed.find({ guild: result.guildId }).lean(),
			]);

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

			if (tags && tags.length) {
				tags = tags.map(tag => {
					return Object.keys(tag)
						.filter(key => !filteredKeys.includes(key))
						.reduce((obj, key) => {
							obj[key] = tag[key]; return obj;
						}, {});
					});
				tags = this.parseConfig(tags, channels, roles);
			}

			if (automessages && automessages.length) {
				automessages = automessages.map(automessage => {
					return Object.keys(automessage)
						.filter(key => !filteredKeys.includes(key))
						.reduce((obj, key) => {
							obj[key] = automessage[key]; return obj;
						}, {});
					});
				automessages = this.parseConfig(automessages, channels, roles);
			}

			if (autopurges && autopurges.length) {
				autopurges = autopurges.map(autopurge => {
					return Object.keys(autopurge)
						.filter(key => !filteredKeys.includes(key))
						.reduce((obj, key) => {
							obj[key] = autopurge[key]; return obj;
						}, {});
					});
				autopurges = this.parseConfig(autopurges, channels, roles);
			}

			if (reddits && reddits.length) {
				reddits = reddits.map(reddit => {
					return Object.keys(reddit)
						.filter(key => !filteredKeys.includes(key))
						.reduce((obj, key) => {
							obj[key] = reddit[key]; return obj;
						}, {});
					});
				reddits = this.parseConfig(reddits, channels, roles);
			}

			if (embeds && embeds.length) {
				embeds = embeds.map(embed => {
					return Object.keys(embed)
						.filter(key => !filteredKeys.includes(key))
						.reduce((obj, key) => {
							obj[key] = embed[key]; return obj;
						}, {});
					});
				embeds = this.parseConfig(embeds, channels, roles);
			}

			return res.send({ config: { config, automessages, autopurges, tags, reddits, embeds } });
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}
}

module.exports = Support;

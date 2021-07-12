'use strict';

const superagent = require('superagent');
const logger = require('./logger');
const models = require('./models');
const utils = require('./utils');
const redis = require('./redis');

class Controller {
	/**
	 * Post update to bots
	 * @param {String} guildId Guild ID
	 * @return {Promise}
	 */
	postUpdate(guildId) {
		return new Promise((resolve) => models.Dyno.findOne().lean().exec()
			.then(doc => {
				if (!doc) return resolve();
				if (!doc.webhooks) return resolve();

				for (const webhook of doc.webhooks) {
					superagent
						.post(`${webhook}/guildUpdate`)
						.send(guildId)
						.set('Accept', 'application/json')
						.end(err => err ? logger.error(err) : false);
				}

				return resolve();
			})
			.catch(err => {
				logger.error(err);
				return resolve();
			}));
	}

	generateKey(str) {
		if (!config.cryptkey) return;
		return utils.sha256(`${config.cryptkey}${str}`);
	}
}

module.exports = Controller;

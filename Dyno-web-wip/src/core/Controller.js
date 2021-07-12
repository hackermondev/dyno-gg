'use strict';

const superagent = require('superagent');
const config = require('./config');
const logger = require('./logger');
const { models } = require('./models');

const perms = config.permissions;

class Controller {
	constructor(bot) {
		this.bot = bot;
		this.client = bot.snowClient;
	}

	/**
	 * Discord API request
	 * @param {String} token Access Token
	 * @param {String} endpoint API Endpoint
	 * @returns {Promise}
	 */
	apiRequest(token, endpoint) {
		return new Promise((resolve, reject) => {
			superagent
				.get(`${config.api.baseurl}${endpoint}`)
				.set('Authorization', `Bearer ${token}`)
				.set('User-Agent', config.poweredBy)
				.end((err, res) => {
					if (err) {
						if (res && res.status === 401) return reject(401);
						logger.error(err);
						return reject(err);
					}

					if (res.status !== 200) {
						return reject(res.text);
					}

					return resolve(JSON.parse(res.text));
				});
		});
	}

	fetchUser(token, req, res, next) {
		// make API requests to get user and guilds
		return Promise.all([
			this.apiRequest(token, '/users/@me'),
			this.apiRequest(token, '/users/@me/guilds'),
		]).then(([user, guilds]) => {
			guilds = guilds.filter(g => (g.owner === true || !!(g.permissions & perms.manageServer) || !!(g.permissions & perms.administrator)))
				.map(g => {
					if (!req.params.id || g.id !== req.params.id) return g;
					g.selected = true;
					return g;
				});

			if (user.id === config.client.admin) {
				req.session.isAdmin = res.locals.isAdmin = true;
			}

			if (config.global.dashAccess && config.global.dashAccess.includes(user.id)) {
				req.session.dashAccess = res.locals.dashAccess = true;
			}

			if (config.overseers && config.overseers.includes(user.id)) {
				req.session.isAdmin = true;
			}

			req.session.user = res.locals.user = user;
			req.session.guilds = res.locals.guilds = guilds;
			req.session.lastAuth = Date.now();

			return next();
		}).catch(err => {
			if (err === 401) {
				req.session.destroy();
				err = 'You have been logged out';
			}

			res.locals.error = err;
			return next();
		});
	}

	update(id, update) {
		return new Promise((resolve, reject) => models.Server.collection.update({ _id: id }, update)
			.then(resolve)
			.catch(err => {
				logger.error(err);
				return reject(err);
			}));
	}

	weblog(req, guildId, user, action) {
		const doc = new models.WebLog({
			guild: guildId,
			userid: user.id,
			ipAddress: req.realip,
			user,
			action,
		});
		doc.save();
	}

	log(id, message) {
		return logger.info(`[Web] Server: ${id} ${message}`);
	}
}

module.exports = Controller;

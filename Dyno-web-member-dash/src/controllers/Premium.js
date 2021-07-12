'use strict';

const superagent = require('superagent');
const Controller = require('../core/Controller');
const config = require('../core/config');
const logger = require('../core/logger');
const utils = require('../core/utils');

const perms = config.permissions;

const redirect_base = (!config.premium.site.port || parseInt(config.premium.site.port) === 80) ?
	`${config.premium.site.host}` :
	`${config.premium.site.host}:${config.premium.site.port}`;

const authUrl = `https://discordapp.com/oauth2/authorize?redirect_uri=${redirect_base}%2Fvip%2Freturn` +
	`&scope=identify guilds&response_type=code&client_id=${config.premium.client.id}`;
const tokenUrl = 'https://discordapp.com/api/oauth2/token';

class Premium extends Controller {
	constructor(bot) {
		super(bot);

		return {
			vipauth: {
				method: 'get',
				uri: '/vip/auth',
				handler: this.auth.bind(this),
			},
			return: {
				method: 'get',
				uri: '/vip/return',
				handler: this.return.bind(this),
			},
			forward: {
				method: 'get',
				uri: '/vip/forward',
				handler: this.forward.bind(this),
			},
		};
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

	/**
	 * Before middleware
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 * @param {Function} next Next callback
	 */
	async before(bot, req, res, next) {
		// handle redirectTo
		if (req.session && req.session.authServer) {
			let authServer = req.session.authServer,
				redirectTo = `/manage/${authServer}`;

			delete req.session.authServer;

			const guild = await this.client.getRESTGuild(authServer);
			if (guild) {
				return res.redirect(redirectTo);
			}
		}

		res.locals.config = config;

		if (!req.session || !req.session.auth || res.locals.user) return next();

		if (req.session.user) {
			const guilds = req.session.guilds;
			if (req.params.id) {
				const guild = guilds.find(g => g.id === req.params.id);

				if (guild) {
					res.locals.isManager = true;
				}
			}

			res.locals.isAdmin = req.session.isAdmin;
			res.locals.user = req.session.user;
			res.locals.userkey = utils.sha256(`${config.site.secret}${req.session.userid}`);
			res.locals.guilds = req.session.guilds;

			return next();
		}

		const token = req.session.auth.access_token;

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

	/**
	 * Auth request handler
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 */
	auth(bot, req, res) {
		if (!req.session.user) {
			return res.redirect('/');
		}
		return res.redirect(authUrl);
	}

	/**
	 * Logout handler
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 */
	logout(bot, req, res) {
		req.session.destroy(err => {
			if (err) {
				logger.error(err);
			}
			return res.redirect('/');
		});
	}

	/**
	 * OAuth redirect handler
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 */
	return(bot, req, res) {
		if (req.query.error) {
			return res.redirect('/');
		}

		return superagent
			.post(tokenUrl)
			.set('Content-Type', 'application/x-www-form-urlencoded')
			.set('Accept', 'application/json')
			.send({
				grant_type: 'authorization_code',
				code: req.query.code,
				redirect_uri: `${redirect_base}/return`,
				client_id: config.client.id,
				client_secret: config.client.secret,
			})
			.end((err, r) => {
				if (err) {
					logger.error(err);
					return res.redirect('/');
				}

				if (r.body && r.body.access_token) {
					req.session.auth = r.body;
				}

				if (req.query.guild_id) {
					return res.redirect(`/manage/${req.query.guild_id}`);
				}

				if (req.get('Referer')) {
					const guildMatch = new RegExp('guild_id=([0-9]+)&').exec(req.get('Referer'));
					if (guildMatch && guildMatch.length > 1) {
						return res.redirect(`/manage/${guildMatch[1]}`);
					}
				}

				return res.redirect('/');
			});
	}

	/**
	 * Forwarding route for mobile
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 * @returns {*}
	 */
	forward(bot, req, res) {
		const query = req.originalUrl.split('?').slice(1);
		logger.debug(query);
		return res.redirect(`dyno://return?${query}`);
	}
}

module.exports = Premium;

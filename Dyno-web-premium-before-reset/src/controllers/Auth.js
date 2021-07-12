'use strict';

const superagent = require('superagent');
const Controller = require('../core/Controller');
const config = require('../core/config');
const logger = require('../core/logger').get('Auth');
const utils = require('../core/utils');
const { models } = require('../core/models');

const redirect_base = (!config.site.port || parseInt(config.site.port) === 80) ?
	`${config.site.host}` :
	`${config.site.host}:${config.site.port}`;

const authUrl = `https://discordapp.com/oauth2/authorize?redirect_uri=${redirect_base}%2Freturn` +
	`&scope=identify guilds email&response_type=code&prompt=none&client_id=${config.client.id}`;
const tokenUrl = 'https://discordapp.com/api/oauth2/token';

class Auth extends Controller {
	constructor(bot) {
		super(bot);

		return {
			beforeAll: {
				method: 'use',
				uri: '*',
				handler: this.beforeAll.bind(this),
			},
			before: {
				method: 'use',
				uri: [
					'/',
					'/account',
					'/commands/',
					'/partner',
					'/manage/:id',
					'/manage/:id/playlist',
				],
				handler: this.before.bind(this),
			},
			beforeStaging: {
				method: 'use',
				uri: [
					'/commands/',
					'/partner',
					'/faq',
					'/team',
					'/status',
					'/upgrade',
				],
				handler: this.beforeStaging.bind(this),
			},
			auth: {
				method: 'get',
				uri: '/auth',
				handler: this.auth.bind(this),
			},
			api: {
				method: 'get',
				uri: '/api/auth',
				handler: this.api.bind(this),
			},
			logout: {
				method: 'get',
				uri: '/logout',
				handler: this.logout.bind(this),
			},
			return: {
				method: 'get',
				uri: '/return',
				handler: this.return.bind(this),
			},
			forward: {
				method: 'get',
				uri: '/forward',
				handler: this.forward.bind(this),
			},
		};
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
			try {
				const guild = await this.client.getRESTGuild(authServer);

				if (guild) {
					return res.redirect(redirectTo);
				}
			} catch (err) { }
		}

		res.locals.scripts.push('/js/react/navbar.js');
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
		return this.fetchUser(token, req, res, next);
	}

	async beforeAll(bot, req, res, next) {
		if (!req.session || !req.session.auth || !req.session.lastAuth) return next();

		if (req.session.isBanned) {
			return this.renderError(req, res, 403);
		}

		if ((Date.now() - req.session.lastAuth) < 60000) return next();

		if (req.session.user) {
			try {
				const match = await models.Dyno.findOne({ bannedUsers: req.session.user.id }, { bannedUsers: 1 }).lean().exec();
				if (match) {
					req.session.isBanned = true;
					return this.renderError(req, res, 403);
				}
			} catch (err) {
				console.error(err);
				return this.renderError(req, res, 500);
			}
		}

		if (req.query && req.query.testban) {
			return this.renderError(req, res, 403);
		}

		const token = req.session.auth.access_token;
		return this.fetchUser(token, req, res, next);
	}

	api(bot, req, res) {
		if (!req.session || !req.session.auth) return next();
		if (!req.session.user) return next();
		return res.send({
			user: req.session.user,
			guilds: req.session.guilds,
		});
	}

	async beforeStaging(bot, req, res, next) {
		if (!config.staging) {
			return next();
		}

		if (!req.session || !req.session.user || !config.global.staffDashAllowedRoles) {
			return res.redirect('https://www.dyno.gg');
		}

		const dynoMember = await this.client.getRESTGuildMember('203039963636301824', req.session.user.id);

		if (dynoMember.roles) {
			const allowed = dynoMember.roles.some((r) => config.global.staffDashAllowedRoles.includes(r));
			if (!allowed) {
				return res.redirect('https://www.dyno.gg');
			}
		}

		// if (!req.session || !req.session.user ||
		// 	!config.global || !config.global.stagingAccess) {
		// 		return res.redirect('https://www.dynobot.net');
		// 	}

		// if (!config.global.stagingAccess.includes(req.session.user.id)) {
		// 	return res.redirect('https://www.dynobot.net');
		// }

		return next();
	}

	/**
	 * Auth request handler
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 */
	auth(bot, req, res) {
		if (req.session.auth) {
			return res.redirect('/');
		}
		res.locals.redirectURI = authUrl;
		res.locals.pagetitle = 'Login with Discord';
		res.locals.content = `If you're not redirected, <a href="${res.locals.redirectURI}" title="Login with Discord">click here</a> to login with Discord and manage Dyno.`;
		return res.render('redirect', { layout: 'redirect' });
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
			.end(async (err, r) => {
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

				const token = req.session.auth.access_token;

				await this.fetchUser(token, req, res);

				return res.redirect('/account');
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

module.exports = Auth;

'use strict';

const moment = require('moment');
const accounting = require('accounting');
const superagent = require('superagent');
const Controller = require('../core/Controller');
const config = require('../core/config');
const logger = require('../core/logger').get('Index');
const redis = require('../core/redis');
const { models } = require('../core/models');
const stripe = require('stripe')();

/**
 * Index controller
 * @class Index
 * @extends {Controller}
 */
class Index extends Controller {

	/**
	 * Constructor
	 * @returns {Object}
	 */
	constructor(bot) {
		super(bot);

		// define routes
		return {
			before: {
				method: 'use',
				uri: [
					'/commands/',
					'/faq',
					'/team',
					'/upgrade',
				],
				handler: this.before.bind(this),
			},
			index: {
				method: 'get',
				uri: '/',
				handler: this.index.bind(this),
			},
			manage: {
				method: 'get',
				uri: '/manage',
				handler: this.manage.bind(this),
			},
			commands: {
				method: 'get',
				uri: '/commands',
				handler: this.commands.bind(this),
			},
			faq: {
				method: 'get',
				uri: '/faq',
				handler: this.faq.bind(this),
			},
			serverlist: {
				method: 'get',
				uri: '/servers',
				handler: this.serverlist.bind(this),
			},
			serverpage: {
				method: 'get',
				uri: '/server/:id',
				handler: this.serverpage.bind(this),
			},
			serverpageinvite: {
				method: 'get',
				uri: '/server/:id/invite',
				handler: this.serverpageinvite.bind(this),
			},
			discord: {
				method: 'get',
				uri: '/discord',
				handler: this.discord.bind(this),
			},
			invite: {
				method: 'get',
				uri: '/invite',
				handler: this.invite.bind(this),
			},
			team: {
				method: 'get',
				uri: '/team',
				handler: this.team.bind(this),
			},
			sponsors: {
				method: 'get',
				uri: '/sponsors',
				handler: this.sponsors.bind(this),
			},
			upgrade: {
				method: 'get',
				uri: '/upgrade',
				handler: this.upgrade.bind(this),
			},
			upgradeStripe: {
				method: 'post',
				uri: '/upgrade/stripe',
				handler: this.upgradeStripe.bind(this),
			},
			donate: {
				method: 'get',
				uri: '/donate',
				handler: (_, req, res) => res.redirect('/upgrade'),
			},
			terms: {
				method: 'get',
				uri: '/terms',
				handler: this.terms.bind(this),
			},
			privacy: {
				method: 'get',
				uri: '/privacy',
				handler: this.privacy.bind(this),
			},
			setid: {
				method: 'get',
				uri: '/setid',
				handler: this.setid.bind(this),
			},
			stats: {
				method: 'get',
				uri: '/stats',
				handler: (_, req, res) => res.redirect('https://p.datadoghq.com/sb/6ac51d7ba-f48fd68210'),
			},
		};
	}

	before(bot, req, res, next) {
		if (config.isPremium && !config.staging) {
			return res.redirect('https://dyno.gg');
		}

		return next();
	}

	/**
	 * Index handler
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 */
	index(bot, req, res) {
		if (config.isPremium && !config.staging) {
			return res.redirect('https://dyno.gg');
		}

		if (req.query && req.query.code) {
			const tokenUrl = 'https://discordapp.com/api/oauth2/token';

			return superagent
				.post(tokenUrl)
				.set('Content-Type', 'application/x-www-form-urlencoded')
				.set('Accept', 'application/json')
				.send({
					grant_type: 'authorization_code',
					code: req.query.code,
					redirect_uri: `https://www.carbonitex.net/discord/data/botoauth.php`,
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

		const timeout = setTimeout(() => res.render('index'), 1000);

		res.locals.t = moment().format('YYYYMMDDHHmm');

		redis.hgetall(`dyno:guilds:161660517914509312`).then(data => {
			const guildCount = Object.values(data).reduce((a, b) => {
				a += parseInt(b);
				return a;
			}, 0);
			res.locals.guildCount = accounting.format(guildCount, 0);
			clearTimeout(timeout);
			return res.render('index');
		});
	}

	setid(bot, req, res) {
		if (!req.query.id) {
			return res.send('BAD');
		}

		if (req.sessionID && req.sessionID === req.query.id) {
			return res.send('OK');
		}

		req.session.regenerate(e => {
			if (e) {
				logger.error(e);
				return res.send('OHNO!');
			}
			req.sessionID = req.query.id;
			return res.send('OK');
		});
	}

	manage(bot, req, res) {
		if (!req.session || !req.session.user) {
			return res.redirect('/auth');
		}

		return res.redirect('account');
	}

	faq(bot, req, res) {
		res.locals.stylesheets.push('faq');
		return res.render('faq');
	}

	serverlist(bot, req, res) {
		if (!process.env.ENABLE_SERVER_LISTING) {
			return res.status(404).send();
		}
		res.locals.stylesheets.push('serverlist');
		res.locals.externalStylesheets = ['https://cdnjs.cloudflare.com/ajax/libs/hint.css/2.5.0/hint.min.css'];
		return res.render('serverlist');
	}

	serverpage(bot, req, res) {
		if (!process.env.ENABLE_SERVER_LISTING) {
			return res.status(404).send();
		}
		res.locals.stylesheets.push('serverpage');
		res.locals.externalStylesheets = ['https://cdnjs.cloudflare.com/ajax/libs/hint.css/2.5.0/hint.min.css'];
		res.locals.guildId = req.params.id;
		return res.render('serverpage');
	}

	serverpageinvite(bot, req, res) {
		if (!process.env.ENABLE_SERVER_LISTING) {
			return res.status(404).send();
		}
		res.locals.stylesheets.push('serverpageinvite');
		res.locals.guildId = req.params.id;
		res.locals.recaptchaKey = config.site.recaptcha_site_key;
		return res.render('serverpageinvite');
	}

	discord(bot, req, res) {
		res.locals.redirectURI = config.invite;
		res.locals.pagetitle = 'Join Dyno on Discord';
		res.locals.content = `If you're not redirected, <a href="${res.locals.redirectURI}" title="Join Dyno on Discord">click here</a> to be taken to the Dyno Discord server.`;
		return res.render('redirect', { layout: 'redirect' });
	}

	invite(bot, req, res) {
		res.locals.redirectURI = `https://discordapp.com/oauth2/authorize?client_id=${config.client.id}&scope=bot%20identify%20guilds&response_type=code&redirect_uri=https://www.dynobot.net/return&permissions=${config.defaultPermissions}`;
		res.locals.pagetitle = 'Add Dyno to your Discord server';
		res.locals.content = `If you're not redirected, <a href="${res.locals.redirectURI}" title="Invite Dyno">click here</a> to be taken add Dyno.`;
		return res.render('redirect', { layout: 'redirect' });
	}

	async team(bot, req, res) {
		try {
			const globalConfig = await models.Dyno.findOne({}, { team: 1 }).lean().exec();
			res.locals.team = globalConfig.team;
		} catch (err) {
			res.locals.team = config.global.team;
		}

		res.locals.stylesheets.push('team');
		return res.render('team');
	}

	sponsors(bot, req, res) {
		res.locals.stylesheets.push('pages/sponsors');
		return res.render('sponsors');
	}

	upgrade(bot, req, res) {
		if (!req.session.user) {
			res.locals.redirectURI = '/auth';
			res.locals.pagetitle = 'Upgrade Dyno';
			res.locals.content = `If you're not redirected, <a href="${res.locals.redirectURI}" title="Upgrade Dyno">click here</a> to login first.`;
			return res.render('redirect', { layout: 'redirect' });
		}
		res.locals.user = req.session.user;
		res.locals.paypalHost = !req.query.prod && config.test ? config.paypal.sandboxHost : config.paypal.liveHost;
		if (req.query.selected_guild) {
			res.locals.selected_guild = req.query.selected_guild;
		}
		if (req.query.prod) {
			res.locals.prod = req.query.prod;
		}
		res.locals.stylesheets.push('pages/upgrade');
		return res.render('upgrade');
	}

	upgradeStripe(bot, req, res) {
		if (!req.body || !req.body.stripeToken || !req.body.csrf) {
			req.flash('errors', 'Invalid request.');
			return res.redirect('/upgrade');
		}

		if (!this.validateStripe(req.body)) {
			req.flash('errors', 'Mismatching form data. Please try again.');
			return res.redirect('/upgrade');
		}

		stripe.customers.create({
			email: req.body.stripeEmail,
			source: req.body.stripeToken,
		}).then(customer => {
			stripe.subscriptions.create({
				customer: customer.id,
				plan: req.body.plan,
			}).then(subscription => {
				req.session.customer = customer;
				req.session.subscription = subscription;
				return res.redirect('/upgrade/success');
			});
		}).catch(err => {
			logger.error(err);
			req.flash('errors', 'Unable to process your request.');
			return res.redirect('/upgrade');
		});
	}

	commands(bot, req, res) {
		let commands = config.commands;

		// filter commands that shouldn't be shown
		commands = commands.filter(o => (!o.hideFromHelp && !o.disabled) && o.permissions !== 'admin');

		// remove duplicates
		commands = [...new Set(commands)];

		// index by group
		commands = commands.reduce((i, o) => {
			let group = o.group || o.module;
			i[group] = i[group] || [];
			i[group].push(o);
			return i;
		}, {});

		let commandGroups = [];

		for (let key in commands) {
			commandGroups.push({
				name: key,
				commands: commands[key],
			});
		}

		commandGroups[0].isActive = true;

		res.locals.commands = commandGroups;

		return res.render('commands');
	}

	terms(bot, req, res) {
		res.locals.stylesheets.push('legal');
		return res.render('terms');
	}

	privacy(bot, req, res) {
		res.locals.stylesheets.push('legal');
		return res.render('privacy');
	}
}

module.exports = Index;

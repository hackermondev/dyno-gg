'use strict';

const accounting = require('accounting');
const Controller = require('../core/Controller');
const timezones = require('../timezones.json');
const { models } = require('../core/models');
const config = require('../core/config');
const logger = require('../core/logger');
const utils = require('../core/utils');
const { Queue } = models;

const redirect_base = (!config.site.port || parseInt(config.site.port) === 80) ?
    `${config.site.host}` :
    `${config.site.host}:${config.site.port}`;

/**
 * Member controller
 */
class Member extends Controller {

	/**
	 * Constructor
	 * @returns {Object}
	 */
	constructor(bot) {
		super(bot);

		return {
			beforeMember: {
				method: 'use',
				uri: [
					'/member/:id',
					'/member/:id/*',
				],
				handler: this.beforeMember.bind(this),
			},
			member: {
				method: 'get',
				uri: '/member/:id/:page?/:tab?',
				handler: this.member.bind(this),
			},
		};
	}

	/**
	 * Helper method to return if user is an admin of a server
	 * @param {Object} server Server object
	 * @param {Object} user User object
	 * @returns {Boolean}
	 */
	isAdmin(guild, member) {
		if (guild.owner_id === member.id) return true;
		return false;
		// return guild.ownerID === member.id || member.permission.has('administrator') || member.permission.has('manageServer');
	}

	async beforeMember(bot, req, res, next) {
		if (!req.session) {
			return next();
		}

		res.locals.externalStylesheets = ['https://cdnjs.cloudflare.com/ajax/libs/hint.css/2.5.0/hint.min.css'];
		res.locals.stylesheets = ['server'];

		if (req.session.isAdmin) {
			res.locals = Object.assign(res.locals, req.session);
			res.locals.isAdmin = true;
		}

		if (req.session.user) {
			const guilds = req.session.guilds;
			if (req.params.id) {
				let guild;

				guild = guilds.find(g => g.id === req.params.id);

				if (!guild && (req.session.isAdmin || req.session.dashAccess)) {
					guild = await this.client.getRESTGuild(req.params.id);
				}

				if (!guild) {
					return res.redirect('/?error=Unauthorized');
				}

				const hash = utils.sha256(`${config.site.secret}${req.session.user.id}${guild.id}`);

				req.session.apiToken = hash;
				res.locals.isManager = true;
				res.locals.guild = guild;

				// res.locals.scripts.push('https://unpkg.com/angular@1.5.0/angular.min.js');
				// res.locals.externalStylesheets.push('https://unpkg.com/angular-ui-router/release/angular-ui-router.min.js');

				if (req.session.dashAccess) {
					res.locals.dashAccess = true;
				}

				if (req.session.isOverseer) {
					res.locals.isOverseer = true;
				}

				config.guilds.fetch(req.params.id).then(guildConfig => {
					res.locals.guildConfig = guildConfig;
					return next();
				}).catch(err => {
					logger.error(err);
					return res.status(500).send('Error getting server information.');
				});
			}

			if (!res.locals.user) {
				res.locals = Object.assign(res.locals, req.session);
			}
		} else {
			return next();
		}
	}

	/**
	 * Server route handler
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 */
	async member(bot, req, res) {
		const { snowClient: client } = this.bot;

		if (!req.session || !req.session.auth) return res.redirect('/');
		if (!res.locals.isAdmin && !res.locals.isManager) return res.redirect('/');

		const guild = res.locals.guild;
		const guildConfig = res.locals.guildConfig;

		if (guildConfig && guildConfig.beta && !config.beta && !config.test) {
			return res.redirect(`https://beta.dynobot.net/server/${req.params.id}`);
		}

		if (guildConfig && !guildConfig.beta && config.beta && !config.test) {
			return res.redirect(`https://www.dynobot.net/server/${req.params.id}`);
		}

		const redirect_uri = `${redirect_base}/return`;
		const oauthRedirect = `https://discordapp.com/oauth2/authorize?client_id=${config.client.id}&scope=bot&guild_id=${req.params.id}&response_type=code&redirect_uri=${redirect_uri}&permissions=${config.defaultPermissions}`;

		let [restGuild, clientMember] = await Promise.all([
			this.client.getRESTGuild(req.params.id),
			this.client.getSelf(),
		]);

		if (!restGuild) {
			req.session.authServer = req.params.id;
			return res.redirect(oauthRedirect);
		}

		res.locals.scripts.push('//cdnjs.cloudflare.com/ajax/libs/list.js/1.5.0/list.min.js');
		res.locals.scripts.push('/js/react/member.js');

		// bot user details
		res.locals.bot = clientMember;

		guildConfig.prefix = guildConfig.prefix || '?';

		// clone server and merge the server config
		res.locals.server = Object.assign(Object.create(guild.toJSON ? guild.toJSON() : guild),
			Object.create(restGuild.toJSON ? restGuild.toJSON() : restGuild), guildConfig);

		if (res.locals.server.memberCount) {
			res.locals.server.memberCount = accounting.formatNumber(res.locals.server.memberCount);
		}

		res.locals.roles = restGuild.roles && restGuild.roles.size ? utils.sortRoles([...restGuild.roles.values()]) : [];

		const botRole = res.locals.botRole = res.locals.roles.find(r => r.name === 'Dyno');
		res.locals.roles = res.locals.roles.filter(r => r.name !== '@everyone')
			.map(r => {
				const role = r.toJSON();
				if (!botRole) return r;
				if (role.name === 'Dyno') r.disabled = true;
				if (role.position > botRole.position || (role.position === botRole.position && role.id < botRole.id)) {
					role.disabled = true;
				}
				return Object.assign({}, role);
			});

		res.locals.dashboardConfig = {
			isPremium: guildConfig.isPremium,
			roles: res.locals.roles,
			timezones: timezones.zones,
			serverId: guildConfig.id,
			server: {
				name: res.locals.server.name,
				memberCount: res.locals.server.memberCount,
				iconURL: res.locals.server.iconURL,
				initials: res.locals.server.iconURL ?
					undefined :
					res.locals.server.name.match(/[!?#]|(?:\s|^)[a-z]/ig)
						.slice(0, 4)
						.join('')
						.replace(/\s/g, '')
						.toUpperCase(),
			},
		};

		res.locals.enableCaesar = process.env.ENABLE_SERVER_LISTING;

		return res.render('member', { layout: 'server' });
	}
}

module.exports = Member;

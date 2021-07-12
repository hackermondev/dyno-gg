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
 * Server controller
 */
class Server extends Controller {

	/**
	 * Constructor
	 * @returns {Object}
	 */
	constructor(bot) {
		super(bot);

		return {
			beforeServer: {
				method: 'use',
				uri: [
					'/manage/:id',
					'/manage/:id/*',
				],
				handler: this.beforeServer.bind(this),
			},
			server: {
				method: 'get',
				uri: '/server/:id/:page?/:tab?',
				handler: (_, req, res) => res.redirect(`/manage/${req.params.id}`),
			},
			manage: {
				method: 'get',
				uri: '/manage/:id/:page?/:tab?',
				handler: this.server.bind(this),
			},
			playlist: {
				method: 'get',
				uri: '/playlist/:id',
				handler: this.playlist.bind(this),
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

	async beforeServer(bot, req, res, next) {
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
					guild = await this.client.guild.getGuild(req.params.id);
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
	async server(bot, req, res) {
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

		// redirect to authorize the bot
		if (!guild || !guildConfig) {
			req.session.authServer = req.params.id;
			return res.redirect(oauthRedirect);
		}

		if (guildConfig && config.isPremium && !config.test && !config.staging) {
			if (!guildConfig.isPremium) {
				return res.redirect(`https://www.dynobot.net/server/${req.params.id}`);
			}
			try {
				let globalConfig = await models.Dyno.findOne().lean().exec();

				globalConfig = globalConfig || {};
				globalConfig.premiumIgnored = globalConfig.premiumIgnored || [];

				if (globalConfig.premiumIgnored.includes(guild.id) ||
					globalConfig.premiumIgnored.includes(req.session.user.id)) {
						return res.redirect(`https://www.dynobot.net/server/${req.params.id}`);
				}
			} catch (err) {
				return res.status(500).send('Something went wrong.');
			}
		}

		if (guildConfig && !config.isPremium && !config.test && !config.staging) {
			if (guildConfig.isPremium) {
				try {
					let globalConfig = await models.Dyno.findOne().lean().exec();

					globalConfig = globalConfig || {};
					globalConfig.premiumIgnored = globalConfig.premiumIgnored || [];

					if (!globalConfig.premiumIgnored.includes(guild.id) ||
						!globalConfig.premiumIgnored.includes(req.session.user.id)) {
							return res.redirect(`https://premium.dyno.gg/manage/${req.params.id}`);
					}
				} catch (err) {
					return res.status(500).send('Something went wrong.');
				}
			}
		}

		let modules = config.modules,
			commands = config.commands,
			commandGroups = [],
			mods = [];

		let [restGuild, clientMember] = await Promise.all([
			client.guild.getGuild(req.params.id),
			client.user.getSelf(),
		]);

		if (!restGuild) {
			req.session.authServer = req.params.id;
			return res.redirect(oauthRedirect);
		}

		res.locals.scripts.push('//cdnjs.cloudflare.com/ajax/libs/list.js/1.5.0/list.min.js');
		res.locals.scripts.push('/js/react/dashboard.js');

		// bot user details
		res.locals.bot = clientMember;

		guildConfig.prefix = guildConfig.prefix || '?';

		// clone server and merge the server config
		res.locals.server = Object.assign(Object.create(guild.toJSON ? guild.toJSON() : guild),
			Object.create(restGuild.toJSON ? restGuild.toJSON() : restGuild), guildConfig);

		if (res.locals.server.memberCount) {
			res.locals.server.memberCount = accounting.formatNumber(res.locals.server.memberCount);
		}

		// map mod ids to user objects
		res.locals.server.mods = res.locals.server.mods || [];
		res.locals.server.mods = [];

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

		// map mod role id's to role objects
		// res.locals.server.modRoles = res.locals.server.modRoles || [];
		// res.locals.server.modRoles = res.locals.server.modRoles.map(id => {
		// 	const role = res.locals.roles.find(r => r.id === id);
		// 	return role || { id: id, name: 'unknown' };
		// });

		// list of server admins
		res.locals.admins = [];
		// res.locals.server.admins = [...guild.members.values()].filter(m => m.bot !== true && this.isAdmin(guild, m));

		// filter modules
		res.locals.modules = Array.from(modules.values())
			.filter(m => {
				let filtered = !(~mods.indexOf(m.module) || (m.core && !m.list));
				if (m.admin && !res.locals.isAdmin) return false;

				if (filtered) {
					mods.push(m.module);
				}

				return filtered;
			})
			.map(m => {
				const moduleCopy = Object.assign({}, m);

				moduleCopy.enabled = (guildConfig.modules && guildConfig.modules[moduleCopy.module] === true);
				moduleCopy.friendlyName = moduleCopy.friendlyName || moduleCopy.module;
				moduleCopy.partial = `modules/${moduleCopy.module.toLowerCase()}`;
				moduleCopy.partialId = moduleCopy.module.toLowerCase();
				moduleCopy.needsPerms = false;

				if (moduleCopy.vipOnly && !guildConfig.isPremium) {
					moduleCopy.hide = true;
				}

				if (!moduleCopy.permissions) return moduleCopy;

				return moduleCopy;
			});

		for (const mod of modules.values()) {
			// admin enabled
			if (mod.adminEnabled) {
				let enabled = guildConfig.modules[mod.module];

				if (res.locals.isAdmin || enabled) {
					res.locals.adminEnabled = res.locals.adminEnabled || {};
					res.locals.adminEnabled[mod.module] = true;
				}
			}

			// permissions check
			// if (mod.permissions && mod.enabled) {
				// const clientMember = res.locals.bot;

				// for (const perm of mod.permissions) {
				// 	res.locals.needsPerms = res.locals.needsPerms || [];
				// 	if (!clientMember.permission.has(perm) && !res.locals.needsPerms.includes(perm)) {
				// 		res.locals.needsPerms.push(perm);
				// 	}
				// }
			// }
		}

		// remove admin commands
		commands = commands.filter(c => c.permissions !== 'admin')
			.map(c => {
				c.enabled = (!guildConfig.commands || guildConfig.commands[c.name] !== false);
				if (guildConfig.modules[c.group]) c.noedit = true;
				if (c.commands) {
					c.commands = c.commands.map(s => {
						s.enabled = (!guildConfig.subcommands || !guildConfig.subcommands[c.name] || guildConfig.subcommands[c.name][s.name] !== false);
						return s;
					});
				}
				return c;
			}); // .sort((a, b) => +(a.group > b.group) || +(a.group === b.group) - 1);

		// remove duplicates
		commands = [...new Set(commands)];

		// index by group
		commands = commands.reduce((i, o) => {
			i[o.group] = i[o.group] || [];
			i[o.group].push(o);
			return i;
		}, {});

		// create grouped array
		for (let key in commands) {
			commandGroups.push({
				name: key,
				commands: commands[key],
			});
		}

		commandGroups[commandGroups.length - 1].isLast = true;

		res.locals.commands = commandGroups;

		// try {
		// 	const tags = await models.Tag.find({ guild: guild.id }).lean().exec();
		// 	if (tags && tags.length) {
		// 		res.locals.tags = tags;
		// 	}
		// } catch (err) {
		// 	logger.error(err);
		// }

		// try {
		// 	const moderations = await models.Moderation.find({ server: guild.id, type: 'role' }).lean().exec();
		// 	if (moderations && moderations.length) {
		// 		res.locals.persistedRoles = moderations.map(m => {
		// 			const moderation = Object.create(m);
		// 			const role = res.locals.roles.find(r => r.id === m.role);
		// 			moderation.role = role ? role : { id: m.role, name: 'Deleted Role' };
		// 			return moderation;
		// 		});
		// 	}
		// } catch (err) {
		// 	logger.error(err);
		// }

		// try {
		// 	const doc = await models.Queue.findOne({ guild: guild.id }).lean().exec();
		// 	if (doc) {
		// 		const queue = doc ? doc.queue || [] : [];

		// 		for (let i = 0; i < queue.length; i++) {
		// 			queue[i].index = i + 1;
		// 		}
		// 		res.locals.queue = queue;
		// 	}
		// } catch (err) {
		// 	logger.error(err);
		// }

		// try {
		// 	const logs = await models.WebLog.find({ guild: guild.id })
		// 		.sort({ createdAt: -1 })
		// 		.limit(100)
		// 		.lean()
		// 		.exec();
		// 	if (logs && logs.length) {
		// 		res.locals.webLogs = logs;
		// 	}
		// } catch (err) {
		// 	logger.error(err);
		// }

		res.locals.globalwords = config.automod.badwords || [];
		res.locals.badwords = guildConfig.automod ? guildConfig.automod.badwords || [] : [];
		res.locals.exactwords = guildConfig.automod ? guildConfig.automod.exactwords || [] : [];
		// res.locals.timezones = timezones.zones;

		res.locals.dashboardConfig = {
			isPremium: guildConfig.isPremium,
			modules: res.locals.modules.map(m => {
				const mod = Object.assign({}, m);
				delete mod.settings;
				return mod;
			}),
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

		return res.render('server', { layout: 'server' });
	}

	/**
	 * Get playlist for a server
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 */
	async playlist(bot, req, res) {
		try {
			var [guild, doc] = await Promise.all([
				this.client.guild.getGuild(req.params.id),
				Queue.findOne({ guild: req.params.id }).lean().exec(),
			]);
		} catch (err) {
			return res.redirect('/?error=PlaylistError');
		}

		if (!guild) {
			return res.redirect('/?error=NotFound');
		}

		const queue = doc ? doc.queue || [] : [];

		for (let i = 0; i < queue.length; i++) {
			queue[i].index = i + 1;
		}

		res.locals.server = guild;
		res.locals.queue = queue;

		res.render('playlist');
	}
}

module.exports = Server;

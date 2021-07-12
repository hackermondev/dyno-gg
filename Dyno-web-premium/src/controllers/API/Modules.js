'use strict';

// const accounting = require('accounting');
const Controller = require('../../core/Controller');
// const timezones = require('../../timezones.json');
const config = require('../../core/config');
const logger = require('../../core/logger').get('Modules');
const utils = require('../../core/utils');
const db = require('../../core/models');
const models = db.models;

class Modules extends Controller {
	constructor(bot) {
		super(bot);

		const basePath = '/api/modules/:id';

		this.guildCache = new Map();
		this.channelCache = new Map();
		this.bansCache = new Map();

		this.clearCacheInterval = setInterval(this.clearCaches.bind(this), 10000);

		return {
			beforeModules: {
				method: 'use',
				uri: [
					'/api/modules/:id',
					'/api/modules/:id/*',
				],
				handler: this.beforeModules.bind(this),
			},
			actionlog: {
				method: 'get',
				uri: `${basePath}/actionlog`,
				handler: this.getActionLog.bind(this),
			},
			announcements: {
				method: 'get',
				uri: `${basePath}/announcements`,
				handler: this.getAnnouncements.bind(this),
			},
			automessage: {
				method: 'get',
				uri: `${basePath}/automessage`,
				handler: this.getAutomessage.bind(this),
			},
			automod: {
				method: 'get',
				uri: `${basePath}/automod`,
				handler: this.getAutomod.bind(this),
			},
			autopurge: {
				method: 'get',
				uri: `${basePath}/autopurge`,
				handler: this.getAutopurge.bind(this),
			},
			autoresponder: {
				method: 'get',
				uri: `${basePath}/autoresponder`,
				handler: this.getAutoresponder.bind(this),
			},
			autoroles: {
				method: 'get',
				uri: `${basePath}/autoroles`,
				handler: this.getAutoroles.bind(this),
			},
			bans: {
				method: 'get',
				uri: `${basePath}/bans/:page`,
				handler: this.getBans.bind(this),
			},
			channels: {
				method: 'get',
				uri: `${basePath}/channels`,
				handler: this.getChannels.bind(this),
			},
			cleverbot: {
				method: 'get',
				uri: `${basePath}/cleverbot`,
				handler: this.getCleverbot.bind(this),
			},
			commands: {
				method: 'get',
				uri: `${basePath}/commands/:type?/:typeId?`,
				handler: this.getCommands.bind(this),
			},
			moduleCommands: {
				method: 'get',
				uri: `${basePath}/modulecommands/:module`,
				handler: this.getModuleCommands.bind(this),
			},
			customcommands: {
				method: 'get',
				uri: `${basePath}/customcommands`,
				handler: this.getCustomCommands.bind(this),
			},
			customcommandsfull: {
				method: 'get',
				uri: `${basePath}/customcommands/full`,
				handler: this.getCustomCommandsFull.bind(this),
			},
			messageEmbeds: {
				method: 'get',
				uri: `${basePath}/messageEmbeds`,
				handler: this.getMessageEmbeds.bind(this),
			},
			moderation: {
				method: 'get',
				uri: `${basePath}/moderation`,
				handler: this.getModeration.bind(this),
			},
			music: {
				method: 'get',
				uri: `${basePath}/music`,
				handler: this.getMusic.bind(this),
			},
			musicQueue: {
				method: 'get',
				uri: `${basePath}/music-queue`,
				handler: this.getMusicQueue.bind(this),
			},
			ranks: {
				method: 'get',
				uri: `${basePath}/ranks`,
				handler: this.getRanks.bind(this),
			},
			roles: {
				method: 'get',
				uri: `${basePath}/roles`,
				handler: this.getRoles.bind(this),
			},
			reddit: {
				method: 'get',
				uri: `${basePath}/reddit`,
				handler: this.getReddit.bind(this),
			},
			sandbox: {
				method: 'get',
				uri: `${basePath}/sandbox`,
				handler: this.getSandbox.bind(this),
			},
			settings: {
				method: 'get',
				uri: `${basePath}/settings`,
				handler: this.getSettings.bind(this),
			},
			slowmode: {
				method: 'get',
				uri: `${basePath}/slowmode`,
				handler: this.getSlowmode.bind(this),
			},
			tags: {
				method: 'get',
				uri: `${basePath}/tags`,
				handler: this.getTags.bind(this),
			},
			tagsList: {
				method: 'get',
				uri: `${basePath}/tags/list`,
				handler: this.getTagsList.bind(this),
			},
			voicetextlinking: {
				method: 'get',
				uri: `${basePath}/voicetextlinking`,
				handler: this.getVTL.bind(this),
			},
			welcome: {
				method: 'get',
				uri: `${basePath}/welcome`,
				handler: this.getWelcome.bind(this),
			},
			reactionroles: {
				method: 'get',
				uri: `${basePath}/reactionroles`,
				handler: this.getReactionroles.bind(this),
			},

		};
	}

	clearCaches() {
		for (let [key, o] of this.guildCache) {
			if (Date.now() - o.cachedAt > 45000) {
				this.guildCache.delete(key);
			}
		}

		for (let [key, o] of this.channelCache) {
			if (Date.now() - o.cachedAt > 45000) {
				this.channelCache.delete(key);
			}
		}

		for (let [key, o] of this.bansCache) {
			if (Date.now() - o.cachedAt > 300000) {
				this.bansCache.delete(key);
			}
		}
	}

	isAdmin(guild, member) {
		if (guild.owner_id === member.id) return true;
		return false;
	}

	_formatChannel(channel, ...keys) {
		return utils.pick(channel, 'id', 'type', 'name', 'position', 'parentID', ...keys);
	}

	_formatEmoji(emoji) {
		return utils.pick(emoji, 'id', 'name', 'animated');
	}

	async _getChannels(guildId, ...keys) {
		const channelCache = this.channelCache.get(guildId);
		let channels;

		if (channelCache) {
			channels = channelCache.channels || [];
		} else {
			channels = await this.client.getRESTGuildChannels(guildId);
			this.channelCache.set(guildId, {
				cachedAt: Date.now(),
				channels: channels || [],
			});
		}

		channels = channels || [];

		return Object.values(channels.sort((a, b) => {
			if (a.type !== 4 && b.type === 4) { return 1; }
			if (a.type === 4 && b.type !== 4) { return -1; }
			if (a.type === 2 && b.type !== 2) { return 1; }
			if (a.type !== 2 && b.type === 2) { return -1; }
			return (a.position !== b.position) ? a.position - b.position : a.id - b.id;
		})
		.reduce((a, b) => {
			if (b.type === 4) {
				b.channels = [];
				a[b.id] = b;
			} else if (b.parentID) {
				a[b.parentID].channels = a[b.parentID].channels || [];
				a[b.parentID].channels.push(b);
			} else {
				a[b.id] = b;
			}
			return a;
		}, {}))
		.reduce((a, b) => {
			if (b.channels) {
				let { channels, ...c } = b;
				a.push(c);
				a = a.concat(channels);
			} else {
				a.push(b);
			}
			return a;
		}, []).map(c => this._formatChannel(c, ...keys));

		// return channels.map(c => this._formatChannel(c, ...keys))
		// 	.sort((c1, c2) => (c1.position !== c2.position) ? c1.position - c2.position : c1.id - c2.id);
	}

	_getRoles(guild) {
		const roles = guild.roles || [];
		return roles.filter(r => r.name !== '@everyone')
			.sort((r1, r2) => (r1.position !== r2.position) ? r2.position - r1.position : r1.id - r2.id);
	}

	_getEmojis(guild) {
		const emojis = guild.emojis || [];
		return emojis.map(e => this._formatEmoji(e));
	}

	async beforeModules(bot, req, res, next) {
		if (!req.session || !req.session.auth) {
			return res.status(403).send('Unauthorized 1');
		}
		// if (!res.locals.isAdmin && !res.locals.isManager) {
		// 	return res.status(403).send('Unauthorized 2');
		// }

		if (req.session.isAdmin) {
			res.locals = Object.assign(res.locals, req.session);
			res.locals.isAdmin = true;
		}

		if (!req.session.user) {
			return res.status(403).send('Unauthorized 4');
		}

		const guilds = req.session.guilds;

		if (!req.params.id) {
			return res.status(400).send('Missing id.');
		}

		const hash = utils.sha256(`${config.site.secret}${req.session.user.id}${req.params.id}`);
		if (hash !== req.session.apiToken) {
			return res.status(403).send('Unauthorized 3');
		}

		let guild;

		if (guilds.find(g => g.id === req.params.id) || req.session.isAdmin || req.session.dashAccess) {
			if (this.guildCache.has(req.params.id)) {
				guild = this.guildCache.get(req.params.id);
			} else {
				try {
					let [restGuild, guildConfig] = await Promise.all([
						this.client.getRESTGuild(req.params.id),
						config.guilds.fetch(req.params.id),
					]);

					if (!restGuild) {
						return res.status(404).send('Not Found');
					}

					if (!guildConfig) {
						return res.status(500).send('Error getting server config.');
					}

					res.locals.guild = guild = restGuild;
					res.locals.guildConfig = guildConfig;
				} catch (err) {
					logger.error(err);
					return res.status(500).send('Something went wrong.');
				}
				this.guildCache.set(req.params.id, {
					cachedAt: Date.now(),
					...guild,
				});
			}
		}

		if (!guild) {
			return res.status(404).send('Not Found');
		}

		if (!res.locals.guildConfig) {
			try {
				const guildConfig = await config.guilds.fetch(req.params.id);
				if (!guildConfig) {
					return res.status(500).send('Error getting server config.');
				}

				res.locals.guild = guild;
				res.locals.guildConfig = guildConfig;
			} catch (err) {
				logger.error(err);
				return res.status(500).send('Something went wrong.');
			}
		}

		res.locals.isManager = true;

		if (req.session.dashAccess) {
			res.locals.dashAccess = true;
		}

		if (req.session.isOverseer) {
			res.locals.isOverseer = true;
		}

		if (!res.locals.user) {
			res.locals = Object.assign(res.locals, req.session);
		}

		const isValidChannelRequest = await utils.isChannelPayloadValid(req, this.client);

		if(!isValidChannelRequest) {
			return res.status(403).send('Forbidden');
		}

		return next();
	}

	async getActionLog(bot, req, res) {
		try {
			const channels = await this._getChannels(req.params.id);
			const payload = {
				actionlog: res.locals.guildConfig.actionlog || {},
				channels,
				newAccThreshold: res.locals.guildConfig.newAccThreshold || 3
			};

			return res.send(payload);
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}

	async getAnnouncements(bot, req, res) {
		try {
			const channels = await this._getChannels(req.params.id);
			const payload = {
				announcements: res.locals.guildConfig.announcements || {},
				channels,
			};

			return res.send(payload);
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}

	async getAutomessage(bot, req, res) {
		try {
			const [channels, messages] = await Promise.all([
				this._getChannels(req.params.id),
				db.collection('automessages').find({ guild: req.params.id, disabled: { $ne: true } }, { projection: { webhook: 0 }}).toArray(),
			]);

			return res.send({ channels, messages });
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}

	async getReddit(bot, req, res) {
		try {
			const [channels, subscriptions] = await Promise.all([
				this._getChannels(req.params.id, 'nsfw'),
				db.collection('reddits').find({ guildId: req.params.id }, { projection: { webhookId: 0, webhookToken: 0 }}).toArray(),
			]);

			return res.send({ channels, subscriptions });
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}

	async getAutopurge(bot, req, res) {
		try {
			const [channels, roles, purges] = await Promise.all([
				this._getChannels(req.params.id),
				this._getRoles(res.locals.guild),
				db.collection('autopurges').find({ guild: req.params.id }).toArray(),
			]);

			return res.send({ channels, purges, roles });
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}

	async getAutoresponder(bot, req, res) {
		try {
			const [channels, emojis] = await Promise.all([
				this._getChannels(req.params.id),
				this._getEmojis(res.locals.guild),
			]);

			const payload = {
				autoresponder: res.locals.guildConfig.autoresponder || {},
				channels, emojis,
			};
			return res.send(payload);
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}

	async getAutoroles(bot, req, res) {
		try {
			const payload = {
				autoroles: res.locals.guildConfig.autoroles || {},
			};
			return res.send(payload);
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}

	async getBans(bot, req, res) {
		const page = req.params.page;

		try {
			let cachedBans = this.bansCache.get(req.params.id);
			let bans;

			if (!cachedBans) {
				bans = await this.client.getGuildBans(req.params.id);
				this.bansCache.set(req.params.id, {
					cachedAt: Date.now(),
					bans: JSON.parse(JSON.stringify(bans)) || [],
				});
			} else {
				bans = cachedBans.bans;
			}

			if (req.query.search) {
				console.log(req.query.search);
				bans = bans.filter(ban =>
					(ban.reason && ban.reason.search(new RegExp(req.query.search, 'g')) !== -1) ||
					ban.user.username.search(new RegExp(req.query.search, 'g')) !== -1 ||
					ban.user.discriminator.search(new RegExp(req.query.search, 'g')) !== -1);
			}

			const start = (page - 1) * 50;
			const pages = Math.ceil(bans.length / 50);

			console.log(start, bans.length);

			bans = bans.slice(start, start + 50);

			console.log(bans.length);

			return res.status(200).send({ bans, pages });
		} catch (err) {
			console.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}

	async getAutomod(bot, req, res) {
		try {
			const [channels, roles] = await Promise.all([
				this._getChannels(req.params.id),
				this._getRoles(res.locals.guild),
			]);

			const payload = {
				automod: res.locals.guildConfig.automod || {},
				channels, roles,
			};

			return res.send(payload);
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}

	async getChannels(bot, req, res) {
		try {
			const channels = await this._getChannels(req.params.id);
			return res.send({ channels });
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}

	async getCleverbot(bot, req, res) {
		try {
			const channels = await this._getChannels(req.params.id);
			const cleverbot = res.locals.guildConfig.cleverbot || {};

			return res.send({ cleverbot, channels });
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}

	async getCommands(bot, req, res) {
		const guildConfig = res.locals.guildConfig;

		let commands = config.commands;
		let commandGroups = [];

		// remove admin commands
		commands = commands.filter(c => c.permissions !== 'admin')
			.map(c => {
				let commandConfig = guildConfig;

				if (req.params.type) {
					let type = `${req.params.type}Permissions`;
					commandConfig = guildConfig[type] ? (guildConfig[type][req.params.typeId] || guildConfig[type]) : {};
				}

				if (commandConfig.commands && typeof commandConfig.commands[c.name] === 'object') {
					c = Object.assign(c, commandConfig.commands[c.name]);
					// c.enabled = commandConfig.commands[c.name].enabled || false;
				} else {
					c.enabled = (!commandConfig.commands || commandConfig.commands[c.name] !== false);
				}
				c.group = c.group || c.module;

				if (guildConfig.modules[c.group]) c.noedit = true;
				if (c.commands) {
					c.commands = c.commands
						.filter(s => !s.default)
						.map(s => {
							s.enabled = (!commandConfig.subcommands || !commandConfig.subcommands[c.name] || commandConfig.subcommands[c.name][s.name] !== false);
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

		const [channels, roles] = await Promise.all([
			this._getChannels(req.params.id),
			this._getRoles(res.locals.guild),
		]);

		return res.send({
			commands: commandGroups,
			channels,
			prefix: guildConfig.prefix || '?',
			roles,
		});
	}

	async getModuleCommands(bot, req, res) {
		const guildConfig = res.locals.guildConfig;

		let commands = config.commands;

		const [channels, roles] = await Promise.all([
			this._getChannels(req.params.id),
			this._getRoles(res.locals.guild),
		]);

		// remove admin commands
		commands = commands.filter(c => c.permissions !== 'admin')
			.map(c => {
				let commandConfig = guildConfig;

				if (req.params.type) {
					let type = `${req.params.type}Permissions`;
					commandConfig = guildConfig[type] ? (guildConfig[type][req.params.typeId] || guildConfig[type]) : {};
				}

				if (commandConfig.commands && typeof commandConfig.commands[c.name] === 'object') {
					c = Object.assign(c, commandConfig.commands[c.name]);
					// c.enabled = commandConfig.commands[c.name].enabled || false;
				} else {
					c.enabled = (!commandConfig.commands || commandConfig.commands[c.name] !== false);
				}
				c.group = c.group || c.module;

				if (guildConfig.modules[c.group]) c.noedit = true;
				if (c.commands) {
					c.commands = c.commands
						.filter(s => !s.default)
						.map(s => {
							s.enabled = (!commandConfig.subcommands || !commandConfig.subcommands[c.name] || commandConfig.subcommands[c.name][s.name] !== false);
							return s;
						});
				}

				return c;
			}); // .sort((a, b) => +(a.group > b.group) || +(a.group === b.group) - 1);

		// remove duplicates
		commands = [...new Set(commands)];

		commands = commands.filter(c => c.module && c.module === req.params.module);

		// index by group
		// commands = commands.reduce((i, o) => {
		// 	i[o.module] = i[o.module] || [];
		// 	i[o.module].push(o);
		// 	return i;
		// }, {});

		// create grouped array
		// for (let key in commands) {
		// 	commandGroups.push({
		// 		name: key,
		// 		commands: commands[key],
		// 	});
		// }

		// commandGroups[commandGroups.length - 1].isLast = true;

		return res.send({
			commands: commands,
			prefix: guildConfig.prefix || '?',
			channels, roles,
		});
	}

	async getCustomCommands(bot, req, res) {
		const payload = {
			customcommands: res.locals.guildConfig.customcommands || {},
			prefix: res.locals.guildConfig.prefix || '?',
		};

		return res.send(payload);
	}

	async getCustomCommandsFull(bot, req, res) {
		try {
			const [channels, roles] = await Promise.all([
				this._getChannels(req.params.id),
				this._getRoles(res.locals.guild),
			]);

			const payload = {
				customcommands: res.locals.guildConfig.customcommands || {},
				prefix: res.locals.guildConfig.prefix || '?',
				channels, roles,
			};

			return res.send(payload);
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}

	async getMessageEmbeds(bot, req, res) {
		try {
			const [channels, roles, messages] = await Promise.all([
				this._getChannels(req.params.id),
				this._getRoles(res.locals.guild),
				models.MessageEmbed.find({ guild: req.params.id }),
			]);
			return res.send({ channels, roles, messages, debug: res.locals.guildConfig.debugEnabled || false });
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}

	async getModeration(bot, req, res) {
		try {
			const [channels, roles] = await Promise.all([
				this._getChannels(req.params.id),
				this._getRoles(res.locals.guild),
			]);

			const payload = {
				moderation: res.locals.guildConfig.moderation || {},
				modRoles: res.locals.guildConfig.modRoles || [],
				channels, roles,
			};

			return res.send(payload);
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}

	async getMusic(bot, req, res) {
		try {
			const [channels, roles] = await Promise.all([
				this._getChannels(req.params.id),
				this._getRoles(res.locals.guild),
			]);

			const payload = {
				music: res.locals.guildConfig.music || {},
				channels, roles,
			};

			return res.send(payload);
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}

	async getMusicQueue(bot, req, res) {
		try {
			const payload = await db.collection('queues').findOne({ guild: req.params.id });
			const queue = payload && payload.queue ? payload.queue : [];

			return res.send(queue);
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}

	async getRanks(bot, req, res) {
		try {
			const roles = await this._getRoles(res.locals.guild);
			const autoroles = res.locals.guildConfig.autoroles || {};
			const ranks = autoroles.ranks || [];

			const payload = { ranks, roles };

			if (autoroles.disableMulti) {
				payload.disableMulti = autoroles.disableMulti;
			}

			return res.send(payload);
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}

	async getRoles(bot, req, res) {
		try {
			const roles = await this._getRoles(res.locals.guild);
			return res.send({ roles });
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}

	async getSandbox(bot, req, res) {
		if (!req.session.isAdmin) {
			return res.status(403).send('Forbidden');
		}
		try {
			const [channels, emojis, roles] = await Promise.all([
				this._getChannels(req.params.id),
				this._getEmojis(res.locals.guild),
				this._getRoles(res.locals.guild),
			]);

			const payload = {
				channels, emojis, roles,
			};
			return res.send(payload);
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}

	async getSettings(bot, req, res) {
		const guild = res.locals.guild;
		const guildConfig = res.locals.guildConfig;

		try {
			const [clientMember, channels, roles] = await Promise.all([
				this.client.getRESTGuildMember(guild.id, bot.user.id),
				this._getChannels(req.params.id),
				this._getRoles(res.locals.guild),
			]);
			const payload = {
				nick: clientMember.nick,
				server: {
					name: guildConfig.name,
					modonly: guildConfig.modonly,
					prefix: guildConfig.prefix,
					region: guildConfig.region,
					memberCount: guildConfig.memberCount,
					timezone: guildConfig.timezone,
				},
				channels, roles,
			};

			return res.send(payload);
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}

	async getSlowmode(bot, req, res) {
		try {
			const channels = await this._getChannels(req.params.id);

			const payload = {
				slowmode: res.locals.guildConfig.slowmode || {},
				channels,
			};

			return res.send(payload);
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}

	async getTags(bot, req, res) {
		try {
			const roles = await this._getRoles(res.locals.guild);
			const payload = {
				tags: res.locals.guildConfig.tags || {},
				roles,
			};

			return res.send(payload);
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}

	async getTagsList(bot, req, res) {
		try {
			const tags = await models.Tag.find({ guild: res.locals.guild.id }).lean().exec();
			const payload = {
				tags: tags || [],
				prefix: res.locals.guildConfig.prefix || '?',
			};

			return res.send(payload);
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}

	async getVTL(bot, req, res) {
		try {
			const channels = await this._getChannels(req.params.id);

			const payload = {
				voicetextlinking: res.locals.guildConfig.voicetextlinking || {},
				channels,
			};

			return res.send(payload);
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}

	async getWelcome(bot, req, res) {
		try {
			const [channels, roles] = await Promise.all([
				this._getChannels(req.params.id),
				this._getRoles(res.locals.guild),
			]);
			const payload = {
				welcome: res.locals.guildConfig.welcome || {},
				channels, roles,
			};

			return res.send(payload);
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}
	async getReactionroles(bot, req, res) {
		try {
			const [channels, roles, emojis] = await Promise.all([
				this._getChannels(req.params.id),
				this._getRoles(res.locals.guild),
				this._getEmojis(res.locals.guild),
			]);
			const payload = {
				reactionroles: res.locals.guildConfig.reactionroles || {},
				channels, roles, emojis,
			};

			return res.send(payload);
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}
}

module.exports = Modules;

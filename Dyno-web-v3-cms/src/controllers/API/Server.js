'use strict';

const chalk = require('chalk');
const Controller = require('../../core/Controller');
const config = require('../../core/config');
const logger = require('../../core/logger');
const utils = require('../../core/utils');
const models = require('../../core/models');

class Server extends Controller {
	constructor(bot) {
		super(bot);

		this.settingLimits = {
			prefix: 5,
			nickname: 32,
		};

		return {
			beforeApi: {
				method: 'use',
				uri: [
					'/api/server/:id/*',
				],
				handler: this.beforeApi.bind(this),
			},
			playlistDelete: {
				method: 'post',
				uri: '/api/server/:id/playlist/delete',
				handler: this.playlistDelete.bind(this),
			},
			playlistClear: {
				method: 'post',
				uri: '/api/server/:id/playlist/clear',
				handler: this.playlistClear.bind(this),
			},
			removeModerator: {
				method: 'post',
				uri: '/api/server/:id/removeModerator',
				handler: this.removeModerator.bind(this),
			},
			updateMod: {
				method: 'post',
				uri: '/api/server/:id/updateMod',
				handler: this.updateMod.bind(this),
			},
			toggleCommand: {
				method: 'post',
				uri: '/api/server/:id/toggleCommand',
				handler: this.toggleCommand.bind(this),
			},
			toggleSubcommand: {
				method: 'post',
				uri: '/api/server/:id/toggleSubcommand',
				handler: this.toggleSubcommand.bind(this),
			},
			updateNick: {
				method: 'post',
				uri: '/api/server/:id/updateNick',
				handler: this.updateNick.bind(this),
			},
			updateSetting: {
				method: 'post',
				uri: '/api/server/:id/updateSetting',
				handler: this.updateSetting.bind(this),
			},
			updateModSetting: {
				method: 'post',
				uri: '/api/server/:id/updateModSetting',
				handler: this.updateModuleSetting.bind(this),
			},
			createCustomCommand: {
				method: 'post',
				uri: '/api/server/:id/customCommand/create',
				handler: this.createCustomCommand.bind(this),
			},
			deleteCustomCommand: {
				method: 'post',
				uri: '/api/server/:id/customCommand/delete',
				handler: this.deleteCustomCommand.bind(this),
			},
			editCustomCommand: {
				method: 'post',
				uri: '/api/server/:id/customCommand/edit',
				handler: this.editCustomCommand.bind(this),				
			},
			createAutoresponse: {
				method: 'post',
				uri: '/api/server/:id/autoResponse/create',
				handler: this.createAutoresponse.bind(this),
			},
			deleteAutoresponse: {
				method: 'post',
				uri: '/api/server/:id/autoResponse/delete',
				handler: this.deleteAutoresponse.bind(this),
			},
			editAutoresponse: {
				method: 'post',
				uri: '/api/server/:id/autoResponse/edit',
				handler: this.editAutoresponse.bind(this),				
			},
			addBannedWords: {
				method: 'post',
				uri: '/api/server/:id/bannedWords/add',
				handler: this.addBannedWords.bind(this),
			},
			delBannedWords: {
				method: 'post',
				uri: '/api/server/:id/bannedWords/remove',
				handler: this.delBannedWords.bind(this),
			},
			clearBannedWords: {
				method: 'post',
				uri: '/api/server/:id/bannedWords/clear',
				handler: this.clearBannedWords.bind(this),
			},
			addWhitelistUrl: {
				method: 'post',
				uri: '/api/server/:id/whitelistUrl/add',
				handler: this.addWhitelistUrl.bind(this),
			},
			removeWhitelistUrl: {
				method: 'post',
				uri: '/api/server/:id/whitelistUrl/remove',
				handler: this.removeWhitelistUrl.bind(this),
			},
			addBlacklistUrl: {
				method: 'post',
				uri: '/api/server/:id/blacklistUrl/add',
				handler: this.addBlacklistUrl.bind(this),
			},
			removeBlacklistUrl: {
				method: 'post',
				uri: '/api/server/:id/blacklistUrl/remove',
				handler: this.removeBlacklistUrl.bind(this),
			},
			addModuleItem: {
				method: 'post',
				uri: '/api/server/:id/moduleItem/add',
				handler: this.addModuleItem.bind(this),
			},
			removeModuleItem: {
				method: 'post',
				uri: '/api/server/:id/moduleItem/remove',
				handler: this.removeModuleItem.bind(this),
			},
			removeTag: {
				method: 'post',
				uri: '/api/server/:id/tags/delete',
				handler: this.removeTag.bind(this),
			},
			createTag: {
				method: 'post',
				uri: '/api/server/:id/tags/create',
				handler: this.createTag.bind(this),
			},
			editTag: {
				method: 'post',
				uri: '/api/server/:id/tags/edit',
				handler: this.editTag.bind(this),				
			},
			removePersist: {
				method: 'post',
				uri: '/api/server/:id/persist/delete',
				handler: this.removePersist.bind(this),
			},
			createAutorole: {
				method: 'post',
				uri: '/api/server/:id/autoroles/create',
				handler: this.createAutorole.bind(this),
			},
			removeAutorole: {
				method: 'post',
				uri: '/api/server/:id/autoroles/delete',
				handler: this.removeAutorole.bind(this),
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
		return guild.ownerID === member.id || member.permission.has('administrator') || member.permission.has('manageServer');
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
		return logger.info(`${chalk.red('[Web] ')} Server: ${id} ${message}`);
	}

	update(id, update) {
		return new Promise((resolve, reject) => models.Server.update({ _id: id }, update).exec()
			.then(() => {
				this.postUpdate(id);
				return resolve();
			})
			.catch(err => {
				logger.error(err);
				return reject(err);
			}));
	}

	async beforeApi(bot, req, res, next) {
		if (!req.session.apiToken || !req.session.user) {
			return res.status(403).send('Unauthorized 1');
		}

		const guilds = req.session.guilds;
		let guild = guilds.find(g => g.id === req.params.id);

		let isAdmin = (req.session && req.session.user &&
			(req.session.user.id === config.client.admin || config.overseers.includes(req.session.user.id)));

		if (!guild && isAdmin) {
			guild = await this.getRESTData('Guild', 300, req.params.id);
		}

		if (!guild) {
			return res.status(403).send('Unauthorized 2');
		}

		res.locals.isManager = true;

		if (!res.locals.user) {
			res.locals = Object.assign(req.session);
		}

		if (req.body && isAdmin) {
			return next();
		}

		const hash = utils.sha256(`${config.site.secret}${req.session.user.id}${req.params.id}`);

		if (hash !== req.session.apiToken) {
			return res.status(403).send('Unauthorized 3');
		}

		return next();
	}

	/**
	 * Delete item from playlist
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 */
	async playlistDelete(bot, req, res) {
		if (!req.body)
			return res.status(500).send('No request body.');
		if (!req.body.index)
			return res.status(500).send('No song specified.');

		// let queue = config.queue ? config.queue[req.params.id] || [] : [];
		try {
			const doc = await models.Queue.findOne({ guild: req.params.id });
			if (doc) {
				let queue = doc ? doc.queue || [] : [];

				for (let i = 0; i < queue.length; i++) {
					queue[i].index = i + 1;
				}

				// make sure the queue still exists
				if (!queue.length) return res.status(500).send('Queue is empty.');

				// delete from queue
				queue = queue.splice(--req.body.index, 1);

				await models.Queue.update({ guild: req.params.id }, { $set: { queue: queue } });

				this.weblog(req, req.params.id, req.session.user, 'Deleted song from queue.');

				return res.status(200).send('OK');
			} else {
				return res.status(500).send('Queue is empty.');
			}
		} catch (err) {
			return res.status(500).send('An error occurred.');
		}
	}

	/**
	 * Clear the playlist
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 */
	playlistClear(bot, req, res) {
		let queue = config.queue ? config.queue[req.params.id] || [] : [];

		// make sure the queue still exists
		if (!queue.length) return res.status(500).send('Queue is already empty.');

		// clear the queue
		config.queue[req.params.id] = [];

		return res.status(200).send('OK');
	}

	/**
	 * Remove moderator, user or role
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 */
	async removeModerator(bot, req, res) {
		if (!req.body.id)
			return res.status(500).send('No id specified.');

		let guild = await config.guilds.getOrFetch(req.params.id);

		guild.mods = guild.mods || [];
		guild.modRoles = guild.modRoles || [];

		let userIndex = guild.mods.indexOf(req.body.id),
			roleIndex = guild.modRoles.indexOf(req.body.id);

		if (userIndex === -1 && roleIndex === -1) {
			return res.status(500).send('An error occurred.');
		}

		let key = userIndex > -1 ? 'mods' : (roleIndex > -1 ? 'modRoles' : null),
			index = userIndex > -1 ? userIndex : (roleIndex > -1 ? roleIndex : null);

		guild[key].splice(index, 1);

		return this.update(req.params.id, { $set: { [key]: guild[key] } })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, `Removed moderator: ${req.body.id}.`);
				this.log(req.params.id, `Removed moderator: ${req.body.id}`);
				return res.status(200).send('OK');
			})
			.catch(err => res.status(500).send(err));
	}

	/**
	 * Enable/disable modules
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 */
	updateMod(bot, req, res) {
		if (!req.body)
			return res.status(500).send('No request body.');
		if (!req.body.module)
			return res.status(500).send('No module specified.');

		const key = `modules.${req.body.module}`;
		const enabled = (req.body.enabled === 'true') ? true : false; // eslint-disable-line

		return this.update(req.params.id, { $set: { [key]: enabled } })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, `${enabled ? 'Enabled' : 'Disabled'} ${req.body.module} module.`);
				this.log(req.params.id, `Module ${req.body.module} ${enabled ? 'enabled' : 'disabled'}.`);
				return res.status(200).send('OK');
			})
			.catch(err => res.status(500).send(err));
	}

	/**
	 * Enable/disable commands
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 */
	toggleCommand(bot, req, res) {
		if (!req.body)
			return res.status(500).send('No request body.');
		if (!req.body.command)
			return res.status(500).send('No command specified.');

		let enabled = (req.body.enabled === 'true') ? true : false, // eslint-disable-line
			key = `commands.${req.body.command}`;

		return this.update(req.params.id, { $set: { [key]: enabled } })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, `${enabled ? 'Enabled' : 'Disabled'} ${req.body.command} command.`);
				this.log(req.params.id, `Command ${req.body.command} ${enabled ? 'enabled' : 'disabled'}.`);
				return res.status(200).send('OK');
			})
			.catch(err => res.status(500).send(err));
	}

	/**
	 * Enable/disable sub commands
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 */
	toggleSubcommand(bot, req, res) {
		if (!req.body)
			return res.status(500).send('No request body.');
		if (!req.body.command)
			return res.status(500).send('No command specified.');

		let [command, subcommand] = req.body.command.split('.');

		let enabled = (req.body.enabled === 'true') ? true : false, // eslint-disable-line
			key = `subcommands.${command}.${subcommand}`;

		if (enabled !== false) {
			return this.update(req.params.id, { $unset: { [key]: 1 } })
				.then(() => {
					this.weblog(req, req.params.id, req.session.user, `${enabled ? 'Enabled' : 'Disabled'} ${command}.${subcommand} command.`);
					this.log(req.params.id, `Subcommand ${command}.${subcommand} ${enabled ? 'enabled' : 'disabled'}.`);
					return res.status(200).send('OK');
				})
				.catch(err => res.status(500).send(err));
		}

		return this.update(req.params.id, { $set: { [key]: enabled } })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, `${enabled ? 'Enabled' : 'Disabled'} ${command}.${subcommand} command.`);
				this.log(req.params.id, `Subcommand ${command}.${subcommand} ${enabled ? 'enabled' : 'disabled'}.`);
				return res.status(200).send('OK');
			})
			.catch(err => res.status(500).send(err));
	}

	/**
	 * Update nickname
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 */
	async updateNick(bot, req, res) {
		if (req.body.nick.length > this.settingLimits.nickname) {
			return res.status(500).send('Nickname is too long.');
		}

		return bot.client.editNickname(req.params.id, req.body.nick)
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, `Changed nickname to ${req.body.nick}`);
				this.log(req.params.id, `Nickname changed to: ${req.body.nick}`);
					return res.status(200).send('OK');
			})
			.catch(err => res.status(500).send(err));
	}

	/**
	 * Update server setting
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 */
	updateSetting(bot, req, res) {
		if (!req.body.setting)
			return res.status(500).send('No setting specified.');

		const maxLength = this.settingLimits[req.body.setting];

		if (maxLength && req.body.value.length > maxLength) {
			return res.status(500).send('Setting length is too long.');
		}

		const value = req.body.value.length ? req.body.value : null;

		return this.update(req.params.id, { $set: { [req.body.setting]: value } })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, `Changed ${req.body.setting} setting: ${value}`);
				this.log(req.params.id, `Setting ${req.body.setting} changed to: ${value}`);
				return res.status(200).send('OK');
			})
			.catch(err => res.status(500).send(err));
	}

	/**
	 * Update module setting
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 */
	async updateModuleSetting(bot, req, res) {
		if (!req.body.module)
			return res.status(500).send('No module specified.');
		if (!req.body.setting)
			return res.status(500).send('No setting specified.');

		const value = (req.body.value === 'true') ? true : ((req.body.value === 'false') ? false : req.body.value);
		const guild = await config.guilds.getOrFetch(req.params.id);

		guild[req.body.module] = guild[req.body.module] || {};
		guild[req.body.module][req.body.setting] = value || false;

		return this.update(req.params.id, { $set: { [req.body.module]: guild[req.body.module] } })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, `Changed ${req.body.module}.${req.body.setting} setting: ${value}`);
				this.log(req.params.id, `Setting ${req.body.module}.${req.body.setting} changed to ${value}`);
				return res.status(200).send('OK');
			})
			.catch(err => res.status(500).send(err));
	}

	/**
	 * Create custom command
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 */
	async createCustomCommand(bot, req, res) {
		if (!req.body.command)
			return res.status(500).send('No command specified.');
		if (!req.body.response)
			return res.status(500).send('No response specified.');

		const guild = await config.guilds.getOrFetch(req.params.id);
		const key = `customcommands.commands.${req.body.command}`;
		const command = { command: req.body.command, response: req.body.response };

		const invalidMatch = command.match(/[^a-zA-Z0-9\-_]/);
		if (invalidMatch) {
			return res.status(500).send(`Command ${command.toLowerCase()} contains invalid characters.`);
		}

		if (config.commands.has(req.body.command))
			return res.status(500).send('Command already exists.');

		guild.customcommands = guild.customcommands || {};
		guild.customcommands.commands = guild.customcommands.commands || {};

		if (guild.customcommands.commands[req.body.command]) {
			return res.status(500).send('Command already exists.');
		}

		return this.update(req.params.id, { $set: { [key]: command } })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, `Created command: ${req.body.command}`);
				this.log(req.params.id, `Created command: ${req.body.command}`);
				return res.status(200).send('OK');
			})
			.catch(err => res.status(500).send(err));
	}

	/**
	 * Delete custom command
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 */
	async deleteCustomCommand(bot, req, res) {
		if (!req.body.command)
			return res.status(500).send('No command specified.');

		const guild = await config.guilds.getOrFetch(req.params.id);
		const key = `customcommands.commands.${req.body.command}`;

		if (!guild.customcommands || !guild.customcommands.commands[req.body.command]) {
			return res.status(500).send('Command does not exist.');
		}

		delete guild.customcommands.commands[req.body.command];

		return this.update(req.params.id, { $unset: { [key]: 1 } })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, `Deleted command: ${req.body.command}`);
				this.log(req.params.id, `Deleted command: ${req.body.command}`);
				return res.status(200).send('OK');
			})
			.catch(err => res.status(500).send(err));
	}

		/**
	 * Create custom command
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 */
	async editCustomCommand(bot, req, res) {
		if (!req.body.command)
			return res.status(500).send('No command specified.');
		if (!req.body.response)
			return res.status(500).send('No response specified.');

		const guild = await config.guilds.getOrFetch(req.params.id);
		const key = `customcommands.commands.${req.body.command}`;
		const command = { command: req.body.command, response: req.body.response };

		if (config.commands.has(req.body.command))
			return res.status(500).send('Invalid command name.');

		guild.customcommands = guild.customcommands || {};
		guild.customcommands.commands = guild.customcommands.commands || {};

		if (!guild.customcommands.commands[req.body.command]) {
			return res.status(500).send('Command doesn\'t exist.');
		}

		return this.update(req.params.id, { $set: { [key]: command } })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, `Edited command: ${req.body.command}`);
				this.log(req.params.id, `Edited command: ${req.body.command}`);
				return res.status(200).send('OK');
			})
			.catch(err => res.status(500).send(err));
	}
	

	/**
	 * Create Auto response
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 */
	async createAutoresponse(bot, req, res) {
		if (!req.body.command)
			return res.status(500).send('No command specified.');
		if (!req.body.response)
			return res.status(500).send('No response specified.');

		const guild = await config.guilds.getOrFetch(req.params.id);
		const command = { command: req.body.command.toLowerCase(), response: req.body.response };
		const key = 'autoresponder.commands';

		guild.autoresponder = guild.autoresponder || {};
		guild.autoresponder.commands = guild.autoresponder.commands || [];

		if (guild.autoresponder.commands.find(c => c.command === req.body.command)) {
			return res.status(500).send('Auto response already exists.');
		}

		guild.autoresponder.commands.push(command);

		return this.update(req.params.id, { $set: { [key]: guild.autoresponder.commands } })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, `Created auto response: ${req.body.command}`);
				this.log(req.params.id, `Created auto response: ${req.body.command}`);
				return res.status(200).send('OK');
			})
			.catch(err => res.status(500).send(err));
	}

	/**
	 * Delete Auto response
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 */
	async deleteAutoresponse(bot, req, res) {
		if (!req.body.command)
			return res.status(500).send('No command specified.');

		const guild = await config.guilds.getOrFetch(req.params.id);

		if (!guild.autoresponder || !guild.autoresponder.commands.find(c => c.command === req.body.command)) {
			return res.status(500).send('Command does not exist.');
		}

		const index = guild.autoresponder.commands.findIndex(c => c.command === req.body.command);
		const key = 'autoresponder.commands';

		if (index === -1) return res.status(500).send('Error removing response.');

		guild.autoresponder.commands.splice(index, 1);

		return this.update(req.params.id, { $set: { [key]: guild.autoresponder.commands } })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, `Deleted auto response: ${req.body.command}`);
				this.log(req.params.id, `Deleted auto response: ${req.body.command}`);
				return res.status(200).send('OK');
			})
			.catch(err => res.status(500).send(err));
	}

	async editAutoresponse(bot, req, res) {
		if (!req.body.command)
			return res.status(500).send('No command specified.');
		if (!req.body.response)
			return res.status(500).send('No response specified.');

		const guild = await config.guilds.getOrFetch(req.params.id);
		const command = { command: req.body.command, response: req.body.response };
		const index = guild.autoresponder.commands.findIndex(c => c.command === req.body.command);
		const key = 'autoresponder.commands';

		if (index === -1) return res.status(500).send(`Auto response doesn't exist.`);

		guild.autoresponder = guild.autoresponder || {};
		guild.autoresponder.commands = guild.autoresponder.commands || [];

		guild.autoresponder.commands[index] = command;

		return this.update(req.params.id, { $set: { [key]: guild.autoresponder.commands } })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, `Edited auto response: ${req.body.command}`);
				this.log(req.params.id, `Edited response: ${req.body.command}`);
				return res.status(200).send('OK');
			})
			.catch(err => res.status(500).send(err));
	}

	/**
	 * Add banned words
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 */
	async addBannedWords(bot, req, res) {
		if (!req.body.words)
			return res.status(500).send('No words specified.');
		if (!req.body.type)
			return res.status(500).send('No type specified.');

		let server = await config.guilds.getOrFetch(req.params.id),
			words = req.body.words.replace(', ', ',').split(',').filter(w => w.length > 2);

		if (!words.length) {
			return res.status(500).send(`Words didn't meet the length requirement (3+ characters)`);
		}

		if (words.includes('*')) {
			return res.status(500).send(`Words cannot contain *`);
		}

		// explicit in case someone messes with the form input
		const type = req.body.type === 'badwords' ? 'badwords' : 'exactwords';

		server.automod = server.automod || {};
		server.automod[type] = server.automod[type] || [];
		server.automod[type] = server.automod[type].concat(words);
		server.automod[type] = [...new Set(server.automod[type])];

		const key = `automod.${type}`;

		return this.update(req.params.id, { $set: { [key]: server.automod[type] } })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, 'Added banned words.');
				this.log(req.params.id, `Updated Banned Words.`);
				return res.status(200).send('OK');
			})
			.catch(err => res.status(500).send(err));
	}

	/**
	 * Delete banned word
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 */
	async delBannedWords(bot, req, res) {
		if (!req.body.word)
			return res.status(500).send('No word specified.');
		if (!req.body.type)
			return res.status(500).send('No type specified.');

		// explicit in case someone messes with the form input
		const type = req.body.type === 'badwords' ? 'badwords' : 'exactwords';

		let server = await config.guilds.getOrFetch(req.params.id),
			index = server.automod[type].findIndex(w => w === req.body.word);

		if (index === -1) return res.status(500).send('Error removing word.');

		server.automod[type].splice(index, 1);

		const key = `automod.${type}`

		return this.update(req.params.id, { $set: { [key]: server.automod[type] } })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, `Deleted banned word: ${req.body.word}.`);
				this.log(req.params.id, `Updated Banned Words.`);
				return res.status(200).send('OK');
			})
			.catch(err => res.status(500).send(err));
	}

	/**
	 * Clear banned words
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 */
	clearBannedWords(bot, req, res) {
		return this.update(req.params.id, { $set: { 'automod.badwords': [] } })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, 'Removed all banned words.');
				this.log(req.params.id, `Updated Banned Words.`);
				return res.status(200).send('OK');
			})
			.catch(err => res.status(500).send(err));
	}

	/**
	 * Add whitelist url
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 */
	async addWhitelistUrl(bot, req, res) {
		if (!req.body.url || !req.body.url.length)
			return res.status(500).send('No url specified.');

		let server = await config.guilds.getOrFetch(req.params.id);

		server.automod.whiteurls = server.automod.whiteurls || [];
		server.automod.whiteurls.push(req.body.url);

		return this.update(req.params.id, { $set: { 'automod.whiteurls': server.automod.whiteurls } })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, `Added whitelisted url: ${req.body.url}`);
				this.log(req.params.id, `Updated Whitelisted URLs.`);
				return res.status(200).send('OK');
			})
			.catch(err => res.status(500).send(err));
	}

	/**
	 * Remove whitelist url
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 */
	async removeWhitelistUrl(bot, req, res) {
		if (!req.body.url)
			return res.status(500).send('No url specified.');

		let server = await config.guilds.getOrFetch(req.params.id),
			index = server.automod.whiteurls.findIndex(w => w === req.body.url);

		if (index === -1) return res.status(500).send('Error removing URL.');

		server.automod.whiteurls.splice(index, 1);

		return this.update(req.params.id, { $set: { 'automod.whiteurls': server.automod.whiteurls } })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, `Removed whitelisted url: ${req.body.url}`);
				this.log(req.params.id, `Updated Whitelisted URLs.`);
				return res.status(200).send('OK');
			})
			.catch(err => res.status(500).send(err));
	}

	/**
	 * Add whitelist url
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 */
	async addBlacklistUrl(bot, req, res) {
		if (!req.body.url || !req.body.url.length)
			return res.status(500).send('No url specified.');

		let server = await config.guilds.getOrFetch(req.params.id);

		server.automod.blackurls = server.automod.blackurls || [];
		server.automod.blackurls.push(req.body.url);

		return this.update(req.params.id, { $set: { 'automod.blackurls': server.automod.blackurls } })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, `Added blacklisted url: ${req.body.url}.`);
				this.log(req.params.id, `Updated Blacklisted URLs.`);
				return res.status(200).send('OK');
			})
			.catch(err => res.status(500).send(err));
	}

	/**
	 * Remove whitelist url
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 */
	async removeBlacklistUrl(bot, req, res) {
		if (!req.body.url)
			return res.status(500).send('No url specified.');

		let server = await config.guilds.getOrFetch(req.params.id),
			index = server.automod.blackurls.findIndex(w => w === req.body.url);

		if (index === -1) return res.status(500).send('Error removing URL.');

		server.automod.blackurls.splice(index, 1);

		return this.update(req.params.id, { $set: { 'automod.blackurls': server.automod.blackurls } })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, `Removed blacklisted url: ${req.body.url}.`);
				this.log(req.params.id, `Updated Blacklisted URLs.`);
				return res.status(200).send('OK');
			})
			.catch(err => res.status(500).send(err));
	}

	/**
	 * Add coords channel
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 */
	async addModuleItem(bot, req, res) {
		if (!req.body.id)
			return res.status(500).send('No id specified.');
		if (!req.body.module)
			return res.status(500).send('No module specified.');
		if (!req.body.setting)
			return res.status(500).send('No setting specified.');

		let server = await config.guilds.getOrFetch(req.params.id),
			module = req.body.module,
			setting = req.body.setting,
			key = `${module}.${setting}`;

		server[module] = server[module] || {};
		server[module][setting] = server[module][setting] || [];
		server[module][setting].push(utils.upick(req.body, 'module', 'setting'));

		return this.update(req.params.id, { $set: { [key]: server[module][setting] } })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, `Added ${req.body.module}.${req.body.setting}: ${req.body.name}.`);
				this.log(req.params.id, `Added Module Item: ${req.body.module} ${req.body.setting} ${req.body.name}.`);
				return res.status(200).send('OK');
			})
			.catch(err => res.status(500).send(err));
	}

	/**
	 * Remove coords channel
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 */
	async removeModuleItem(bot, req, res) {
		if (!req.body.id)
			return res.status(500).send('No id specified.');
		if (!req.body.module)
			return res.status(500).send('No module specified.');
		if (!req.body.setting)
			return res.status(500).send('No setting specified.');

		let server = await config.guilds.getOrFetch(req.params.id),
			module = req.body.module,
			setting = req.body.setting,
			key = `${module}.${setting}`;

		if (!server[module] || !server[module][setting].find(c => c.id === req.body.id)) {
			return res.status(500).send('Channel does not exist.');
		}

		let index = server[module][setting].findIndex(c => c.id === req.body.id);

		if (index === -1) return res.status(500).send('Error removing channel.');

		server[module][setting].splice(index, 1);

		return this.update(req.params.id, { $set: { [key]: server[module][setting] } })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, `Removed ${req.body.module}.${req.body.setting}: ${req.body.name}.`);
				this.log(req.params.id, `Removed Module Item ${req.body.module} ${req.body.setting} ${req.body.name}`);
				return res.status(200).send('OK');
			})
			.catch(err => res.status(500).send(err));
	}

	async createTag(bot, req, res) {
		if (!req.body.tag)
			return res.status(500).send('No tag name given.');
		if (!req.body.content)
			return res.status(500).send('No tag content given.');

		const tag = req.body.tag;
		const content = req.body.content;

		const invalidMatch = tag.match(/[^a-zA-Z0-9\.:\-_+\/]/);
		if (invalidMatch) {
			return res.status(500).send(`Tag ${tag.toLowerCase()} contains invalid characters.`);
		}

		if (['create', 'edit', 'delete'].includes(tag.toLowerCase())) {
			return res.status(500).send(`${tag.toLowerCase()} is a reserved word.`);
		}

		try {
			const result = await models.Tag.findOne({ guild: req.params.id, tag: tag }).lean().exec();
			if (result) {
				return res.status(500).send(`Tag ${tag.toLowerCase()} already exists.`);
			}
		} catch (err) {
			return res.status(500).send(`Something went wrong.`);
		}

		const doc = {
			guild: req.params.id,
			author: req.session.user,
			tag,
			content,
		};

		try {
			await models.Tag.update({ guild: req.params.id, tag: tag }, doc, { upsert: true });
		} catch (err) {
			return res.status(500).send(`I can't create that tag.`);
		}

		this.weblog(req, req.params.id, req.session.user, `Created tag ${tag.toLowerCase()}`);

		return res.status(200).send('OK');
	}

	async removeTag(bot, req, res) {
		if (!req.body.tag)
			return res.status(500).send('No tag specified.');

		const tag = req.body.tag;

		models.Tag.remove({ _id: tag })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, `Removed tag: ${req.body.name}`);
				this.log(req.params.id, `Removed tag ${req.body.name}`);
				return res.status(200).send('OK');
			})
			.catch(err => res.status(500).send(err));
	}

	async editTag(bot, req, res) {
		if (!req.body.tag)
			return res.status(500).send('No tag name given.');
		if (!req.body.content)
			return res.status(500).send('No tag content given.');

		const tag = req.body.tag;
		const content = req.body.content;

		const invalidMatch = tag.match(/[^a-zA-Z0-9\.:\-_+\/]/);
		if (invalidMatch) {
			return res.status(500).send(`Tag ${tag.toLowerCase()} contains invalid characters.`);
		}

		if (['create', 'edit', 'delete'].includes(tag.toLowerCase())) {
			return res.status(500).send(`${tag.toLowerCase()} is a reserved word.`);
		}

		try {
			const result = await models.Tag.findOne({ guild: req.params.id, tag: tag }).lean().exec();
			if (!result) {
				return res.status(500).send(`Tag ${tag.toLowerCase()} doesn't exist.`);
			}

			result.content = content;

			await models.Tag.update({ guild: req.params.id, tag: tag }, { $set: { content } });

			this.weblog(req, req.params.id, req.session.user, `Edited tag ${req.body.tag}`);

			return res.status(200).send('OK');
		} catch (err) {
			return res.status(500).send(`Something went wrong.`);
		}
	}

	async removePersist(bot, req, res) {
		if (!req.body.id)
			return res.status(500).send('No id specified.');

		const id = req.body.id;

		models.Moderation.remove({ _id: id })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, `Removed role persist`);
				this.log(req.params.id, `Removed role persist`);
				return res.status(200).send('OK');
			})
			.catch(err => res.status(500).send(err));
	}

	async createAutorole(bot, req, res) {
		if (!req.body.role)
			return res.status(500).send('No role specified.');
		if (!req.body.type)
			return res.status(500).send('No type specified.');
		if (!req.body.wait)
			return res.status(500).send('No delay specified.');

		let guildConfig = await config.guilds.getOrFetch(req.params.id);
		if (!guildConfig) {
			return res.status(500).send('An error occurred.');
		}

		guildConfig.autoroles = guildConfig.autoroles || {};
		guildConfig.autoroles.autoroles = guildConfig.autoroles.autoroles || [];
		guildConfig.autoroles.autoroles.push({
			role: req.body.role,
			type: req.body.type,
			wait: req.body.wait,
		});

		return this.update(req.params.id, { $set: { autoroles: guildConfig.autoroles } })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, `Added autorole: ${req.body.type} ${req.body.role} ${req.body.wait}.`);
				this.log(req.params.id, `Added autorole ${req.body.type} ${req.body.role} ${req.body.wait}.`);
				return res.status(200).send('OK');
			})
			.catch(err => res.status(500).send(err));
	}

	async removeAutorole(bot, req, res) {
		if (!req.body.id)
			return res.status(500).send('No id specified.');
		if (!req.body.type)
			return res.status(500).send('No type specified.');
		if (!req.body.wait)
			return res.status(500).send('No delay specified.');
		if (!req.body.name)
			return res.status(500).send('No name specified.');

		let guildConfig = await config.guilds.getOrFetch(req.params.id);
		if (!guildConfig) {
			return res.status(500).send('An error occurred.');
		}

		guildConfig.autoroles = guildConfig.autoroles || {};
		guildConfig.autoroles.autoroles = guildConfig.autoroles.autoroles || [];

		const index = guildConfig.autoroles.autoroles.findIndex(a =>
			a.role === req.body.id &&
			a.type === req.body.type &&
			a.wait === req.body.wait);

		if (index === -1) return res.status(500).send(`Autorole doesn't exist.`);

		guildConfig.autoroles.autoroles.splice(index, 1);

		return this.update(req.params.id, { $set: { 'autoroles.autoroles': guildConfig.autoroles.autoroles } })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, `Removed autorole: ${req.body.name}.`);
				this.log(req.params.id, `Removed autorole ${req.body.name}.`);
				return res.status(200).send('OK');
			})
			.catch(err => res.status(500).send(err));
	}
}

module.exports = Server;

'use strict';

const Controller = require('../../core/Controller');
const config = require('../../core/config');

class Command extends Controller {
	constructor(bot) {
		super(bot);

		const basePath = '/api/server/:id/commands';

		return {
			toggleCommand: {
				method: 'post',
				uri: `${basePath}/toggleCommand`,
				handler: this.toggleCommand.bind(this),
			},
			toggleSubcommand: {
				method: 'post',
				uri: `${basePath}/toggleSubcommand`,
				handler: this.toggleSubcommand.bind(this),
			},
			toggleGroup: {
				method: 'post',
				uri: `${basePath}/:group/toggle`,
				handler: this.toggleGroup.bind(this),
			},
			updateSettings: {
				method: 'post',
				uri: `${basePath}/updateSettings`,
				handler: this.updateSettings.bind(this),
			},
			updateGroup: {
				method: 'post',
				uri: `${basePath}/:group/updateSettings`,
				handler: this.updateGroup.bind(this),
			},
		};
	}

	/**
	 * Enable/disable commands
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 */
	async toggleCommand(bot, req, res) {
		if (!req.body) {
			return res.status(400).send('No request body.');
		}
		if (!req.body.command) {
			return res.status(400).send('No command specified.');
		}

		const enabled = req.body.enabled;
		const key = `commands.${req.body.command}`;

		const guildConfig = await config.guilds.fetch(req.params.id);
		if (!guildConfig) {
			return res.status(500).send('Something went wrong.');
		}

		const { command } = req.body;

		guildConfig.commands = guildConfig.commands || {};
		guildConfig.commands[command] = typeof guildConfig.commands[command] === 'object' ? guildConfig.commands[command] : {};
		guildConfig.commands[command].enabled = enabled;

		return this.update(req.params.id, { $set: { [key]: guildConfig.commands[command] } })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, `${enabled ? 'Enabled' : 'Disabled'} ${req.body.command} command.`);
				this.log(req.params.id, `Command ${req.body.command} ${enabled ? 'enabled' : 'disabled'}.`);
				return res.send('OK');
			})
			.catch(err => res.status(500).send(err));
	}

	async toggleGroup(bot, req, res) {
		if (!req.body) {
			return res.status(400).send('Invalid request.');
		}
		if (!req.body.group) {
			return res.status(400).send('No command group specified.');
		}

		const guildConfig = await config.guilds.fetch(req.params.id);
		if (!guildConfig) {
			return res.status(500).send('Something went wrong.');
		}

		const enabled = req.body.enabled;
		let commands = config.commands;

		commands = commands.filter(c => c.module === req.body.group || c.group === req.body.group);

		for (let command of commands) {
			guildConfig.commands = guildConfig.commands || {};
			guildConfig.commands[command.name] = typeof guildConfig.commands[command.name] === 'object' ? guildConfig.commands[command.name] : {};
			guildConfig.commands[command.name].enabled = enabled;
		}

		return this.update(req.params.id, { $set: { commands: guildConfig.commands } })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, `${enabled ? 'Enabled' : 'Disabled'} all ${req.body.group} commands.`);
				this.log(req.params.id, `Command group ${req.body.group} ${enabled ? 'enabled' : 'disabled'}.`);
				return res.send('OK');
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

		let enabled = req.body.enabled, // eslint-disable-line
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

	async updateSettings(bot, req, res) {
		if (!req.body.command) {
			return res.status(400).send('Missing required command.');
		}
		if (!req.body.settings) {
			return res.status(400).send('Missing required settings.');
		}

		const guildConfig = await config.guilds.fetch(req.params.id);
		if (!guildConfig) {
			return res.status(500).send('Something went wrong.');
		}

		const { command, settings } = req.body;

		guildConfig.commands = guildConfig.commands || {};
		guildConfig.commands[command.name] = guildConfig.commands[command.name] || {};

		if (typeof guildConfig.commands[command.name] === 'boolean') {
			guildConfig.commands[command.name] = { enabled: guildConfig.commands[command.name] };
		}

		const commandSettings = guildConfig.commands[command.name];

		if (commandSettings.hasOwnProperty('allowedChannels') || (settings.allowedChannels && settings.allowedChannels.length)) {
			guildConfig.commands[command.name].allowedChannels = settings.allowedChannels;
		}

		if (commandSettings.hasOwnProperty('ignoredChannels') || (settings.ignoredChannels && settings.ignoredChannels.length)) {
			guildConfig.commands[command.name].ignoredChannels = settings.ignoredChannels;
		}

		if (commandSettings.hasOwnProperty('allowedRoles') || (settings.allowedRoles && settings.allowedRoles.length)) {
			guildConfig.commands[command.name].allowedRoles = settings.allowedRoles;
		}

		if (commandSettings.hasOwnProperty('ignoredRoles') || (settings.ignoredRoles && settings.ignoredRoles.length)) {
			guildConfig.commands[command.name].ignoredRoles = settings.ignoredRoles;
		}

		let key = `commands.${command.name}`;

		return this.update(req.params.id, { $set: { [key]: guildConfig.commands[command.name] } })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, `Updated ${command.name} permissions.`)
				this.log(req.params.id, `Update ${command.name} permissions.`);
				return res.status(200).send('OK');
			})
			.catch(err => res.status(500).send(err));
	}

	async updateGroup(bot, req, res) {
		if (!req.body) {
			return res.status(400).send('Invalid request.');
		}
		if (!req.body.group) {
			return res.status(400).send('Missing required group.');
		}
		if (!req.body.settings) {
			return res.status(400).send('Missing required settings.');
		}

		const guildConfig = await config.guilds.fetch(req.params.id);
		if (!guildConfig) {
			return res.status(500).send('Something went wrong.');
		}

		const { group, settings } = req.body;
		let commands = config.commands;

		commands = commands.filter(c => c.module === req.body.group || c.group === req.body.group);

		guildConfig.commands = guildConfig.commands || {};

		for (const command of commands) {
			guildConfig.commands[command.name] = guildConfig.commands[command.name] || {};

			if (typeof guildConfig.commands[command.name] === 'boolean') {
				guildConfig.commands[command.name] = { enabled: guildConfig.commands[command.name] };
			}

			const commandSettings = guildConfig.commands[command.name];

			if (commandSettings.hasOwnProperty('allowedChannels') || (settings.allowedChannels && settings.allowedChannels.length)) {
				guildConfig.commands[command.name].allowedChannels = settings.allowedChannels;
			}

			if (commandSettings.hasOwnProperty('ignoredChannels') || (settings.ignoredChannels && settings.ignoredChannels.length)) {
				guildConfig.commands[command.name].ignoredChannels = settings.ignoredChannels;
			}

			if (commandSettings.hasOwnProperty('allowedRoles') || (settings.allowedRoles && settings.allowedRoles.length)) {
				guildConfig.commands[command.name].allowedRoles = settings.allowedRoles;
			}

			if (commandSettings.hasOwnProperty('ignoredRoles') || (settings.ignoredRoles && settings.ignoredRoles.length)) {
				guildConfig.commands[command.name].ignoredRoles = settings.ignoredRoles;
			}
		}

		return this.update(req.params.id, { $set: { commands: guildConfig.commands } })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, `Updated permissions for all ${group} commands.`)
				this.log(req.params.id, `Update permissions for all ${group} commands.`);
				return res.send('OK');
			})
			.catch(err => res.status(500).send(err));
	}
}

module.exports = Command;

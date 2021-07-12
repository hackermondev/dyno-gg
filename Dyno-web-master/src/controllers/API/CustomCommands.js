'use strict';

const Controller = require('../../core/Controller');
const config = require('../../core/config');

class CustomCommands extends Controller {
	constructor(bot) {
		super(bot);

		const basePath = '/api/server/:id/customcommands';

		return {
			create: {
				method: 'post',
				uri: `${basePath}/create`,
				handler: this.create.bind(this),
			},
			edit: {
				method: 'post',
				uri: `${basePath}/edit`,
				handler: this.edit.bind(this),
			},
			delete: {
				method: 'post',
				uri: `${basePath}/delete`,
				handler: this.delete.bind(this),
			},
		};
	}

	async create(bot, req, res) {
		if (!req.body.command) {
			return res.status(400).send('Missing required command.');
		}

		const guildConfig = await config.guilds.fetch(req.params.id);
		if (!guildConfig) {
			return res.status(500).send('Something went wrong.');
		}

		let { command } = req.body;

		if (!command.command || !command.response) {
			return res.status(400).send(`Missing required command or response properties.`);
		}

		guildConfig.customcommands = guildConfig.customcommands || {};
		guildConfig.customcommands.commands = guildConfig.customcommands.commands || {};

		if (guildConfig.customcommands.commands[command.command]) {
			return res.status(400).send('Command already exists.');
		}

		guildConfig.customcommands.commands[command.command] = command;

		const key = `customcommands.commands.${command.command}`;

		command = Object.keys(command).reduce((o, key) => {
			if (!command[key] || (command[key] && typeof command[key] !== 'boolean' && !command[key].length)) {
				return o;
			}
			o[key] = command[key];
			return o;
		}, {});

		return this.update(req.params.id, { $set: { [key]: command } })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, `Created command: ${command.command}`);
				this.log(req.params.id, `Created command: ${command.command}`);
				return res.status(200).send('OK');
			})
			.catch(err => res.status(500).send(err));
	}

	async edit(bot, req, res) {
		if (!req.body.command) {
			return res.status(400).send('Missing required command.');
		}

		const guildConfig = await config.guilds.fetch(req.params.id);
		if (!guildConfig) {
			return res.status(500).send('Something went wrong.');
		}

		let { command } = req.body;

		if (!command.command || !command.response) {
			return res.status(400).send(`Missing required command or response properties.`);
		}

		guildConfig.customcommands = guildConfig.customcommands || {};
		guildConfig.customcommands.commands = guildConfig.customcommands.commands || {};

		guildConfig.customcommands.commands[command.command] = command;

		const key = `customcommands.commands.${command.command}`;

		return this.update(req.params.id, { $set: { [key]: command } })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, `Edited command: ${command.command}`);
				this.log(req.params.id, `Edited command: ${command.command}`);
				return res.status(200).send('OK');
			})
			.catch(err => res.status(500).send(err));
	}

	async delete(bot, req, res) {
		if (!req.body.command) {
			return res.status(400).send('Missing required command.');
		}

		const guildConfig = await config.guilds.fetch(req.params.id);
		if (!guildConfig) {
			return res.status(500).send('Something went wrong.');
		}

		const { command } = req.body;

		const key = `customcommands.commands.${command.command}`;

		if (!guildConfig.customcommands || !guildConfig.customcommands.commands[command.command]) {
			return res.status(400).send('Command does not exist.');
		}

		delete guildConfig.customcommands.commands[command.command];

		return this.update(req.params.id, { $unset: { [key]: 1 } })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, `Deleted command: ${command.command}`);
				this.log(req.params.id, `Deleted command: ${command.command}`);
				return res.status(200).send('OK');
			})
			.catch(err => res.status(500).send(err));
	}
}

module.exports = CustomCommands;

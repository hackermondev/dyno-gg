'use strict';

const Controller = require('../../core/Controller');
const config = require('../../core/config');

class Autoresponder extends Controller {
	constructor(bot) {
		super(bot);

		const basePath = '/api/server/:id/autoresponder';

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

		if (!command.command) {
			return res.status(400).send(`Missing required command property.`);
		}

		if (command.type === 'message' && !command.response) {
			return res.status(400).send(`Missing required response property.`);
		}

		guildConfig.autoresponder = guildConfig.autoresponder || {};
		guildConfig.autoresponder.commands = guildConfig.autoresponder.commands || [];

		if (guildConfig.autoresponder.commands.find(c => c.command === command.command)) {
			return res.status(400).send('Response already exists.');
		}

		guildConfig.autoresponder.commands.push(command);

		const key = `autoresponder.commands`;

		return this.update(req.params.id, { $set: { [key]: guildConfig.autoresponder.commands } })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, `Created auto response: ${command.command}`);
				this.log(req.params.id, `Created auto response: ${command.command}`);
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

		if (!command.command) {
			return res.status(400).send(`Missing required command property.`);
		}

		if (command.type === 'message' && !command.response) {
			return res.status(400).send(`Missing required response property.`);
		}

		guildConfig.autoresponder = guildConfig.autoresponder || {};
		guildConfig.autoresponder.commands = guildConfig.autoresponder.commands || [];

		const index = guildConfig.autoresponder.commands.findIndex(c => c.command === command.command);
		if (index === -1) {
			return res.status(400).send(`Auto response doesn't exist.`);
		}

		guildConfig.autoresponder.commands[index] = command;

		const key = `autoresponder.commands`;

		return this.update(req.params.id, { $set: { [key]: guildConfig.autoresponder.commands } })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, `Edited auto response: ${command.command}`);
				this.log(req.params.id, `Edited auto response: ${command.command}`);
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

		const key = `autoresponder.commands`;

		const index = guildConfig.autoresponder.commands.findIndex(c => c.command === command.command);
		if (index === -1) {
			return res.status(400).send('Auto response does not exist.');
		}

		guildConfig.autoresponder.commands.splice(index, 1);

		return this.update(req.params.id, { $set: { [key]: guildConfig.autoresponder.commands } })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, `Deleted auto response: ${command.command}`);
				this.log(req.params.id, `Deleted auto response: ${command.command}`);
				return res.status(200).send('OK');
			})
			.catch(err => res.status(500).send(err));
	}
}

module.exports = Autoresponder;

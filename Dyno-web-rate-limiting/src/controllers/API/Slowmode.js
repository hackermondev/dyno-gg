'use strict';

const moment = require('moment');
const { ObjectID } = require('mongodb');
const Controller = require('../../core/Controller');
const config = require('../../core/config');
const db = require('../../core/models');

class Slowmode extends Controller {
	constructor(bot) {
		super(bot);

		const basePath = '/api/server/:id/slowmode';

		return {
			create: {
				method: 'post',
				uri: `${basePath}/create`,
				handler: this.create.bind(this),
			},
			delete: {
				method: 'post',
				uri: `${basePath}/delete`,
				handler: this.delete.bind(this),
			},
		};
	}

	async create(bot, req, res) {
		if (!req.body.id) {
			return res.status(400).send('Missing required channel.');
		}
		if (!req.body.time) {
			return res.status(400).send('Missing required time.');
		}

		const guildConfig = await config.guilds.fetch(req.params.id);
		if (!guildConfig) {
			return res.status(500).send('Something went wrong.');
		}

		if (!guildConfig.isPremium) {
			return res.status(500).send('Premium verification failed');
		}

		const doc = {
			id: req.body.id,
			time: req.body.time,
		};

		if (req.body.user) {
			doc.user = true;
		}

		guildConfig.slowmode = guildConfig.slowmode || {};
		guildConfig.slowmode.channels = guildConfig.slowmode.channels || [];
		guildConfig.slowmode.channels.push(doc);

		return this.update(req.params.id, { $set: { slowmode: guildConfig.slowmode } })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, `Created Slowmode`);
				this.log(req.params.id, `Created Slowmode`);
				return res.status(200).send('OK');
			})
			.catch(err => res.status(500).send(err));
	}

	async delete(bot, req, res) {
		if (!req.body.channel) {
			return res.status(400).send('Missing required channel.');
		}

		const guildConfig = await config.guilds.fetch(req.params.id);
		if (!guildConfig) {
			return res.status(500).send('Something went wrong.');
		}

		if (!guildConfig.isPremium) {
			return res.status(500).send('Premium verification failed');
		}

		guildConfig.slowmode = guildConfig.slowmode || {};
		guildConfig.slowmode.channels = guildConfig.slowmode.channels || [];

		const index = guildConfig.slowmode.channels.findIndex(c => c.id === req.body.channel.id);
		if (index === -1) {
			return Promise.reject(400).send(`Slowmode isn't enabled on that channel.`);
		}

		guildConfig.slowmode.channels.splice(index, 1);

		return this.update(req.params.id, { $set: { slowmode: guildConfig.slowmode } })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, `Deleted Slowmode`);
				this.log(req.params.id, `Deleted Slowmode`);
				return res.status(200).send('OK');
			})
			.catch(err => res.status(500).send(err));
	}
}

module.exports = Slowmode;

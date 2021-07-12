'use strict';

const moment = require('moment');
const { ObjectID } = require('mongodb');
const Controller = require('../../core/Controller');
const config = require('../../core/config');
const logger = require('../../core/logger').get('Autopurge');
const db = require('../../core/models');

class Autopurge extends Controller {
	constructor(bot) {
		super(bot);

		const basePath = '/api/server/:id/autopurge';

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

	getDocs(guildId, channelId) {
		return db.collection('autopurges').find({ guild: guildId, channel: channelId }).toArray();
	}

	async create(bot, req, res) {
		if (!req.body.interval) {
			return res.status(400).send('Missing required interval.');
		}
		if (!req.body.channel) {
			return res.status(400).send('Missing required channel.');
		}

		const guildConfig = await config.guilds.getOrFetch(req.params.id);
		if (!guildConfig) {
			return res.status(500).send('Something went wrong.');
		}
		let { interval, channel } = req.body;

		interval *= 60;

		if (!guildConfig.isPremium && (interval < 240 || interval > 4320)) {
			return res.status(400).send('Purge interval must be more than 4 hours and no more than 3 days.');
		}

		try {
			const docs = await this.getDocs(req.params.id, channel);
			if (!guildConfig.isPremium && docs && docs.length) {
				return res.status(400).send('Auto purge limit reached.');
			}

			const doc = {
				guild: req.params.id,
				channel: channel,
				interval: interval,
				nextPurge: moment().add(interval, 'minutes').toDate(),
			};

			await db.collection('autopurges').insertOne(doc);

			this.weblog(req, req.params.id, req.session.user, 'Added auto purge.');
			return res.send('Added auto purge.');
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}

	async delete(bot, req, res) {
		if (!req.body.channel) {
			return res.status(400).send('Missing required channel.');
		}

		try {
			const docs = await this.getDocs(req.params.id, req.body.channel.id);
			if (!docs || !docs.length) {
				return res.status(400).send(`Auto purge is not enabled for that channel.`);
			}

			await db.collection('autopurges').deleteOne({ _id: new ObjectID(req.body.purge._id) });

			this.weblog(req, req.params.id, req.session.user, 'Deleted auto purge.');
			return res.send('Deleted auto purge.');
		} catch (err) {
			return res.status(500).send('Something went wrong.');
		}
	}
}

module.exports = Autopurge;

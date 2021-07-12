'use strict';

const each = require('async-each');
const moment = require('moment');
const Module = Loader.require('./core/structures/Module');
const Purger = Loader.require('./helpers/Purger');
const utils = Loader.require('./core/utils');

/**
 * Auto Purge Module
 * @class Autopurge
 * @extends Module
 */
class Autopurge extends Module {
	constructor() {
		super();

		this.module = 'Autopurge';
		this.friendlyName = 'Auto Purge';
		this.description = 'Automatically purge messages in a channel at configurable intervals (times).';
		this.enabled = true;
		this.hasPartial = false;

		this.permissions = ['manageMessages'];
	}

	static get name() {
		return 'Autopurge';
	}

	start() {
		this.purger = new Purger(this.config, this.dyno);
		this.schedule('*/5 * * * *', this.purge.bind(this));
	}

	async purge() {
		try {
			var docs = await this.models.Autopurge.find({ nextPurge: { $lte: Date.now() } }).lean().exec();
		} catch (err) {
			return this.logger.error(err);
		}

		this.logger.info(`Purging ${docs.length} channels.`);

		each(docs, (doc, next) => {
			if (!this.client.guilds.has(doc.guild)) return next();
			return this.purger.purge(doc.channel, 5000)
				.then(() => {
					let nextPurge = moment().add(doc.interval, 'minutes');
					return this.models.Autopurge.update({ _id: doc._id }, { $set: { nextPurge: nextPurge } });
				})
				.catch(() => null);
		});
	}
}

module.exports = Autopurge;

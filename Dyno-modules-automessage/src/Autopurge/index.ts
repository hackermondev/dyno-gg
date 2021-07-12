import {Module, Purger} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as each from 'async-each';
import * as dyno from 'Dyno';
import * as moment from 'moment';
import * as commands from './commands';

// const Purger = Loader.require('./helpers/Purger');

/**
 * Auto Purge Module
 * @class Autopurge
 * @extends Module
 */
export default class Autopurge extends Module {
	public module      : string   = 'Autopurge';
	public friendlyName: string   = 'Auto Purge';
	public description : string   = 'Automatically purge messages in a channel at configurable times.';
	public list        : boolean  = true;
	public enabled     : boolean  = true;
	public hasPartial  : boolean  = false;
	public permissions : string[] = ['manageMessages'];
	public commands    : {}       = commands;
	protected purger   : Purger;

	public start() {
		this.purger = new Purger(this.dyno);
		this.schedule('*/1 * * * *', this.purge.bind(this));
	}

	public async purge() {
		let docs;
		try {
			docs = await this.models.Autopurge.find({ nextPurge: { $lte: Date.now() } }).lean().exec();
		} catch (err) {
			return this.logger.error(err);
		}

		if (!docs || !docs.length) {
			return;
		}

		this.logger.debug(`Found ${docs.length} channels to purge.`);

		each(docs, (doc: any, next: Function) => {
			if (!this.client.guilds.has(doc.guild)) {
				return next();
			}

			this.logger.debug(`Purging ${doc.guild}`);

			this.purger.purge(doc.channel, { limit: 5000 })
				.then(() => {
					const nextPurge = moment().add(doc.interval, 'minutes');
					return this.models.Autopurge.update({ _id: doc._id }, { $set: { nextPurge: nextPurge } });
				})
				.catch(() => null);
			return next();
		});
	}
}

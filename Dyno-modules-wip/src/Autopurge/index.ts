import { Module, Purger } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as each from 'async-each';
import * as dyno from 'Dyno';
import * as moment from 'moment';
import { default as Model } from './models/Autopurge';

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
	public enabled     : boolean  = false;
	public hasPartial  : boolean  = true;
	public vipOnly     : boolean  = true;
	public permissions : string[] = ['manageMessages'];
	public moduleModels: any[]   = [Model];
	// public commands    : {}       = commands;
	protected purger   : Purger;

	public start() {
		this.purger = new Purger(this.dyno);
		this.schedule('0,15,30,45 * * * * *', this.purge.bind(this));
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

		each(docs, async (doc: any, next: Function) => {
			const guild = this.client.guilds.get(doc.guild);
			if (!guild) {
				return next();
			}

			const guildConfig = await this.dyno.guilds.getOrFetch(doc.guild);
			if (!this.isEnabled(guild, this.module, guildConfig)) {
				if (!guildConfig.modules.Autopurge || guildConfig.modules.Autopurge === false) {
					this.models.Autopurge.remove({ _id: doc._id }).catch(() => null);
				}
				return next();
			}

			const channel = guild.channels.get(doc.channel);
			if (!channel) {
				return next();
			}

			this.logger.debug(`Purging ${doc.guild}`);

			this.purger.purge(doc.channel, { limit: 5000 })
				.then(() => {
					const nextPurge = moment().add(doc.interval, 'minutes').toDate();
					this.statsd.increment('autopurge.success', 1);
					return this.models.Autopurge.update({ _id: doc._id }, { $set: { nextPurge: nextPurge } });
				})
				.catch(() => this.statsd.increment('autopurge.error', 1));
			return next();
		});
	}
}

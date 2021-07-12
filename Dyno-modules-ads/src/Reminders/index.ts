import { Module } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as each from 'async-each';
import * as dyno from 'Dyno';
import * as commands from './commands';

/**
 * Reminders Module
 * @class Reminders
 * @extends Module
 */
export default class Reminders extends Module {
	public module     : string  = 'Reminders';
	public description: string  = 'Enables members to set reminders.';
	public list       : boolean = true;
	public enabled    : boolean = true;
	public hasPartial : boolean = false;
	public commands   : {}      = commands;

	public start() {
		// create the cron job
		// this.schedule('*/1 * * * *', this.processReminders.bind(this));
	}

	/**
	 * Process reminders
	 */
	public async processReminders() {
		if (!this.dyno.isReady || ![2, 3].includes(this.config.state)) {
			return;
		}

		let docs;
		try {
			docs = await this.models.Reminder.find({ completedAt: { $lte: Date.now() } }).lean().exec();
			if (!docs || !docs.length) {
				return false;
			}
		} catch (e) {
			return this.logger.error(e, { type: 'reminders.processReminders.find' });
		}

		each(docs, (reminder: Reminder, next: Function) => {
			const guild = this.client.guilds.get(reminder.server);
			const user = this.client.users.get(reminder.user);
			if (!guild || !user) {
				return;
			}

			this.sendDM(user.id, `**Reminder:** ${reminder.content}`)
				.catch((err: string) => this.logger.warn(err));

			this.models.Reminder.remove({ _id: reminder._id }).catch((err: string) => this.logger.error(err));
			process.nextTick(next);
		});
	}
}

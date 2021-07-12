'use strict';

const Module = Loader.require('./core/structures/Module');
const { Reminder } = require('../core/models');

/**
 * Reminders Module
 * @class Reminders
 * @extends Module
 */
class Reminders extends Module {
	constructor() {
		super();

		this.module = 'Reminders';
		this.description = 'Enables members to set reminders.';
		this.enabled = true;
		this.hasPartial = false;
	}

	static get name() {
		return 'Reminders';
	}

	start() {
		// create the cron job
		this.schedule('*/1 * * * *', this.processReminders.bind(this));
	}

	/**
	 * Process reminders
	 * @returns {*}
	 */
	async processReminders() {
		if (!this.dyno.isReady || ![2, 3].includes(this.config.state)) return;

		try {
			var docs = await Reminder.find({ completedAt: { $lte: Date.now() } }).lean().exec();
		} catch (e) {
			return this.logger.error(e, { type: 'reminders.processReminders.find' });
		}

		if (!docs || !docs.length) return false;

		for (const reminder of docs) {
			const guild = this.client.guilds.get(reminder.server);
			if (!guild) continue;

			const user = this.client.users.get(reminder.user);
			if (!user) continue;

			this.sendDM(user.id, `**Reminder:** ${reminder.content}`)
				.catch(err => this.logger.warn(err));

			Reminder.remove({ _id: reminder._id }).catch(err => this.logger.error(err));
		}
	}
}

module.exports = Reminders;

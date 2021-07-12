'use strict';

const path = require('path');
const moment = require('moment');
const Command = Loader.require('./core/structures/Command');
const { Reminder } = require('../../core/models');

class RemindMe extends Command {
	constructor(...args) {
		super(...args);

		this.aliases = ['remindme'];
		this.group = 'Misc';
		this.module = 'Reminders';
		this.description = 'Set a reminder';
		this.usage = 'remindme to buy some game in 10 days';
		this.expectedArgs = 1;
		this.cooldown = 5000;

		this._sherlock = require(path.join(this.config.paths.base, '..', 'node_modules/sherlockjs/sherlock.js'));
	}

	async execute({ message, args }) {
		const parsed = this._sherlock.parse(args.join(' '));

		// return if invalid date
		if (!parsed.startDate) {
			return this.error(message.channel, `I couldn't figure out when you want to be reminded. Please try again.`);
		}

		const doc = {
			server: message.channel.guild.id,
			channel: message.channel.id,
			user: message.author.id,
			content: parsed.eventTitle,
			completedAt: parsed.startDate,
		};

		const reminder = new Reminder(doc);

		try {
			await reminder.save();

			let completedDate = moment(parsed.startDate)
				.add(1, 'minute')
				.startOf('minute')
				.format('MMM DD, YYYY HH:mm');

			return this.success(message.channel, `I'll remind you on ${completedDate}, ${parsed.eventTitle}`);
		} catch (err) {
			this.logger.error(err);
			return this.error(message.channel, 'There was a problem creating your reminder.', err);
		}
	}
}

module.exports = RemindMe;

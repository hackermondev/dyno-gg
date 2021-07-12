import {Command} from '@dyno.gg/dyno-core';
import * as core from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as moment from 'moment-timezone';
import * as sherlock from 'sherlockjs';

export default class RemindMe extends Command {
	public aliases     : string[] = ['remindme'];
	public group       : string   = 'Misc';
	public module      : string   = 'Reminders';
	public description : string   = 'Set a reminder';
	public usage       : string   = 'remindme [time] [reminder]';
	public example     : string   = `remindme 2 days It's tournament day!`;
	public expectedArgs: number   = 1;
	public cooldown    : number   = 5000;

	public async execute({ message, args, guildConfig }: core.CommandData) {
		const parsed = sherlock.parse(args.join(' '));

		// return if invalid date
		if (!parsed.startDate) {
			return this.error(message.channel, `I couldn't figure out when you want to be reminded. Please try again.`);
		}

		const doc = {
			server: (<eris.GuildChannel>message.channel).guild.id,
			channel: message.channel.id,
			user: message.author.id,
			content: parsed.eventTitle,
			completedAt: parsed.startDate,
		};

		const reminder = new this.models.Reminder(doc);

		try {
			await reminder.save();

			const completedDate = moment(parsed.startDate)
				.add(1, 'minute')
				.startOf('minute')
				.tz(guildConfig.timezone || 'America/New_York')
				.format('MMM DD, YYYY HH:mm');

			return this.success(message.channel, `I'll remind you on ${completedDate}, ${parsed.eventTitle}`);
		} catch (err) {
			this.logger.error(err);
			return this.error(message.channel, 'There was a problem creating your reminder.', err);
		}
	}
}

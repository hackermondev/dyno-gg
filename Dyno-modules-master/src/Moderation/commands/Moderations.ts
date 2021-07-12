import {Command} from '@dyno.gg/dyno-core';
import * as core from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as moment from 'moment';
import ModUtils from '../ModUtils';

require('moment-duration-format');

export default class Moderations extends Command {
	public aliases        : string[] = ['moderations'];
	public group          : string   = 'Moderator';
	public module         : string   = 'Moderation';
	public description    : string   = 'Get a list of active moderations (timed) and remaining time.';
	public usage          : string   = 'moderations';
	public example        : string   = 'moderations';
	public permissions    : string   = 'serverMod';
	public overseerEnabled: boolean  = true;
	public cooldown       : number   = 20000;
	public expectedArgs   : number   = 0;

	public async execute({ message, guildConfig }: core.CommandData) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		let msgArray = [];
		let logs;

		try {
			logs = await this.models.Moderation.find({
				server: guild.id,
				completedAt: { $gte: Date.now() },
			}).sort({ completedAt: -1 }).lean().exec();
		} catch (err) {
			return this.error(message.channel, `I'm unable to get logs at this time.`, err);
		}

		if (!logs || !logs.length) {
			return this.sendMessage(message.channel, `There are no active moderations for this server.`);
		}

		for (const log of logs) {
			const diff = moment(log.completedAt).diff(moment());
			// cast as any to fix bug in typedef
			const remaining = (<any>moment.duration(diff)).format('w [weeks] d [days], h [hrs], m [min], s [sec]');
			const user = this.resolveUser(guild, log.user.id);
			const line = `${this.utils.ucfirst(log.type)} | ${this.utils.fullName(user || log.user)} | Remaining: ${remaining}`;
			msgArray.push(line);
		}

		msgArray = this.utils.splitMessage(msgArray, 1950);

		for (const m of msgArray) {
			const embed = {
				title: `${logs.length} Moderations`,
				description: m,
			};
			this.sendMessage(message.channel, { embed });
		}

		return Promise.resolve();
	}
}

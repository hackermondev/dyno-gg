import {Command} from '@dyno.gg/dyno-core';
import * as core from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as moment from 'moment-timezone';
import ModUtils from '../ModUtils';

export default class ModLogs extends Command {
	public aliases        : string[] = ['modlogs'];
	public group          : string   = 'Moderator';
	public module         : string   = 'Moderation';
	public description    : string   = 'Get a list of mod logs for a user';
	public usage          : string   = 'modlogs [user]';
	public example        : string   = 'modlogs NoobLance';
	public permissions    : string   = 'serverMod';
	public overseerEnabled: boolean  = true;
	public cooldown       : number   = 20000;
	public expectedArgs   : number   = 1;

	public async execute({ message, args, guildConfig }: core.CommandData) {
		let logs;
		let user;
		let userid;

		const guild = (<eris.GuildChannel>message.channel).guild;

		if (isNaN(args[0])) {
			user = this.resolveUser(guild, args.join(' '));
			if (!user) {
				return this.error(message.channel, `I can't find user ${args.join(' ')}.`);
			}
			user = user.user || user;
		} else {
			userid = args[0];
		}

		let msgArray = [];

		try {
			logs = await this.models.ModLog.find({
				server: guild.id,
				'user.id': userid || user.id,
			}).sort({ createdAt: -1 }).lean().exec();
		} catch (err) {
			return this.error(message.channel, `I'm unable to get logs at this time.`, err);
		}

		logs = logs && logs.filter((log: ModerationDoc) => log.mod);

		if (!logs || !logs.length) {
			return this.sendMessage(message.channel, `No logs found for that user.`);
		}

		for (const log of logs) {
			const modtext = log.mod ? `\t**Moderator:** ${this.utils.fullName(log.mod)}` : '';
			const line = [
				`**Case ${log.caseNum}**`,
				`\t**Type:** ${log.type}`,
				`\t**User:** (${log.user.id}) ${this.utils.fullName(log.user)} ${modtext.length ? `\n${modtext}` : ''}`,
				`\t**Reason:** ${log.reason} - ${moment(log.createdAt).tz(guildConfig.timezone || 'America/New_York').format('MMM DD YYYY HH:mm:ss')}`,
			];
			msgArray.push(line.join('\n'));
		}

		msgArray = this.utils.splitMessage(msgArray, 1950);

		await this.sendMessage(message.channel, `**${logs.length} Logs Found:**`);

		for (const m of msgArray) {
			const embed = this.buildEmbed({
				description: m,
			}, true);
			this.sendMessage(message.channel, { embed });
		}

		return Promise.resolve();
	}
}

'use strict';

const moment = require('moment');
const Command = Loader.require('./core/structures/Command');

class ModLogs extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['modlogs'];
		this.group        = 'Moderator';
		this.description  = 'Get a list of mod logs for a user';
		this.usage        = 'modlogs [user]';
		this.example      = 'modlogs NoobLance';
		this.permissions  = 'serverMod';
		this.overseerEnabled = true;
		this.cooldown     = 20000;
		this.expectedArgs = 1;
	}

	async execute({ message, args }) {
		if (isNaN(args[0])) {
			var user = this.resolveUser(message.channel.guild, args.join(' '));
			if (!user) {
				return this.error(message.channel, `I can't find user ${args.join(' ')}.`);
			}
			user = user.user || user;
		} else {
			var userid = args[0];
		}

		let msgArray = [];

		try {
			var logs = await this.models.ModLog.find({ server: message.channel.guild.id, 'user.id': userid || user.id }).sort({ createdAt: -1 }).lean().exec();
		} catch (err) {
			return this.error(message.channel, `I'm unable to get logs at this time.`, err);
		}

		if (!logs) {
			return this.sendMessage(message.channel, `No logs found for that user.`);
		}

		for (const log of logs) {
			let modtext = log.mod ? `\t**Moderator:** ${this.utils.fullName(log.mod)}` : '';
			let line = [
				`**Case ${log.caseNum}**`,
				`\t**Type:** ${log.type}`,
				`\t**User:** (${log.user.id}) ${this.utils.fullName(log.user)} ${modtext.length ? `\n${modtext}` : ''}`,
				`\t**Reason:** ${log.reason} - ${moment(log.createdAt).format('MMM DD HH:mm:ss')}`,
			];
			msgArray.push(line.join('\n'));
		}

		msgArray = this.utils.splitMessage(msgArray, 1950);

		await this.sendMessage(message.channel, `**${logs.length} Logs Found:**`);

		for (const m of msgArray) {
			let embed = {
				description: m,
			};
			this.sendMessage(message.channel, { embed });
		}

		return Promise.resolve();
	}
}

module.exports = ModLogs;

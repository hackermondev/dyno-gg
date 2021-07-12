import {Command} from '@dyno.gg/dyno-core';
import * as core from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as dyno from 'Dyno';
import ModUtils from '../ModUtils';

export default class Reason extends Command {
	public aliases: string[]      = ['reason'];
	public group: string        = 'Moderator';
	public module: string       = 'Moderation';
	public description: string  = 'Supply a reason for a mod log case';
	public usage: string        = 'reason [case num] [reason]';
	public example: string      = 'reason 5 Spamming lewd images';
	public permissions: string  = 'serverMod';
	public cooldown: number     = 5000;
	public expectedArgs: number = 2;

	public execute({ message, args, guildConfig }: core.CommandData) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		const caseNum = parseInt(args[0], 10);
		const reason = args.slice(1).join(' ');

		return this.models.ModLog.findOneAndUpdate({ server: guild.id, caseNum: caseNum }, { $set: { reason } }, { new: true }).exec()
			.then((log: any) => this.updateLog(message, log, guildConfig))
			.catch(() => null);
	}

	private async updateLog(message: eris.Message, log: any, guildConfig: dyno.GuildConfig) {
		if (!log) {
			return this.error(message.channel, `I couldn't find that log entry`);
		}

		const successMessage = `Changed reason for case #${log.caseNum}`;

		if (!guildConfig.moderation || !guildConfig.moderation.channel || !log.message) {
			return this.success(message.channel, successMessage);
		}

		const msg = await this.client.getMessage(guildConfig.moderation.channel, log.message).catch(() => null);
		if (!msg) {
			return this.success(message.channel, successMessage);
		}

		const embed = msg.embeds[0];
		let hasReason = false;

		embed.fields = embed.fields.map((f: any) => {
			if (f.name === 'Reason') {
				f.value = log.reason;
				hasReason = true;
			}
			return f;
		});

		if (!hasReason) {
			embed.fields.push({ name: 'Reason', value: log.reason, inline: true });
		}

		return msg.edit({ embed })
			.then(() => this.success(message.channel, `Updated Case #${log.caseNum}`))
			.catch(() => this.error(message.channel, `Unable to update that log entry.`));
	}
}

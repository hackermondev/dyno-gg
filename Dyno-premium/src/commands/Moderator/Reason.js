'use strict';

const Command = Loader.require('./core/structures/Command');

class Reason extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['reason'];
		this.group        = 'Moderator';
		this.description  = 'Supply a reason for a mod log case';
		this.usage        = 'reason [case num] [reason]';
		this.example      = 'reason 5 Spamming lewd images';
		this.permissions  = 'serverMod';
		this.disableDM    = true;
		this.cooldown     = 5000;
		this.expectedArgs = 2;
	}

	async updateLog(message, log, guildConfig) {
		if (!log) return this.error(message.channel, `I couldn't find that log entry`);

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

		embed.fields = embed.fields.map(f => {
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

	execute({ message, args, guildConfig }) {
		const caseNum = parseInt(args[0]);
		const reason = args.slice(1).join(' ');

		return this.models.ModLog.findOneAndUpdate({ server: message.guild.id, caseNum: caseNum }, { $set: { reason } }, { new: true }).exec()
			.then(log => this.updateLog(message, log, guildConfig))
			.catch(() => this.error(message.channel, `I couldn't find that log entry`));
	}
}

module.exports = Reason;

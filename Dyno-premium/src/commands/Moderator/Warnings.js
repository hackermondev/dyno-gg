'use strict';

const moment = require('moment');
const Command = Loader.require('./core/structures/Command');

class Warnings extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['warnings'];
		this.group        = 'Moderator';
		this.description  = 'Get warnings for the server or user';
		this.usage        = 'warnings [user]';
		this.example      = 'warnings | warnings NoobLance';
		this.permissions  = 'serverMod';
		this.overseerEnabled = true;
		this.cooldown     = 10000;
		this.expectedArgs = 0;
	}

	async execute({ message, args }) {
		if (args.length) {
			var user = this.resolveUser(message.channel.guild, args.join(' '));
			if (!user) {
				return this.error(message.channel, `I can't find user ${args.join(' ')}.`);
			}
		}

		let msgArray = [],
			warnings;

		if (user) {
			warnings = await this.models.Warning.find({ guild: message.channel.guild.id, 'user.id': user.id }).lean().exec();
		} else {
			warnings = await this.models.Warning.find({ guild: message.channel.guild.id }).lean().exec();
		}

		for (const warning of warnings) {
			let line = [
				`User: (${warning.user.id}) ${this.utils.fullName(warning.user)} Moderator: ${this.utils.fullName(warning.mod)}`,
				`\t${warning.reason} - ${moment(warning.createdAt).format('MMM DD')}`,
			];
			msgArray.push(line.join('\n'));
		}

		msgArray = this.utils.splitMessage(msgArray, 1950);

		if (!warnings || !warnings.length) {
			return this.sendMessage(message.channel, `There are no warnings.`);
		}

		await this.sendMessage(message.channel, `**${warnings.length} Warnings:**`);

		for (const m of msgArray) {
			this.sendCode(message.channel, m);
		}

		return Promise.resolve();
	}
}

module.exports = Warnings;

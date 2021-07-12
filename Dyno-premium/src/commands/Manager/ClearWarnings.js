'use strict';

const Command = Loader.require('./core/structures/Command');
const { Warning } = require('../../core/models');

class ClearWarnings extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['clearwarn'];
		this.group        = 'Manager';
		this.description  = 'Clear warnings a user';
		this.usage        = 'clearwarn [user]';
		// this.example      = 'clearwarn NoobLance';
		this.permissions  = 'serverAdmin';
		this.expectedArgs = 1;

		this.example = [
			'clearwarn NoobLance',
			'clearwarn all',
		];
	}

	async execute({ message, args }) {
		if (isNaN(args[0]) && args[0] !== 'all') {
			var user = this.resolveUser(message.channel.guild, args.join(' '));
			if (!user) {
				return this.error(message.channel, `I can't find user ${args.join(' ')}.`);
			}
			user = user.user || user;
		} else if (args[0] === 'all') {
			if (message.author.id !== message.guild.ownerID) {
				return this.error(message.channel, 'Only the server owner can clear all warnings.');
			}

			try {
				await Warning.remove({ guild: message.channel.guild.id }).exec();
			} catch (err) {
				this.logger.error(err);
				return this.error(message.channel, 'Something went wrong.');
			}

			return this.success(message.channel, `Cleared all warnings for this server.`);
		} else {
			var userid = args[0];
		}

		try {
			var warnings = await Warning.find({ guild: message.channel.guild.id, 'user.id': userid || user.id }).lean().exec();
			if (!warnings) {
				return this.error(message.channel, `No warnings found for ${userid || user.mention}.`);
			}
			await Warning.remove({ guild: message.channel.guild.id, 'user.id': userid || user.id }).exec();
		} catch (err) {
			this.logger.error(err);
			return this.error(message.channel, 'Something went wrong.');
		}

		if (warnings) {
			return this.success(message.channel, `Cleared ${warnings.length} warnings for ${userid || this.utils.fullName(user)}.`);
		}
	}
}

module.exports = ClearWarnings;

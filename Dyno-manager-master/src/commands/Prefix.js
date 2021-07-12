'use strict';

const {Command} = require('@dyno.gg/dyno-core');

class Prefix extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['prefix'];
		this.group        = 'Manager';
		this.description  = 'Set prefix for server';
		this.usage        = 'prefix [prefix]';
		this.permissions  = 'serverAdmin';
		this.overseerEnabled = true;
		this.disableDM    = true;
		this.expectedArgs = 0;
	}

	async execute({ message, args, guildConfig }) {
		if (!args.length) {
			return this.sendMessage(message.channel, `The prefix for this server is \`${guildConfig.prefix}\``);
		}

		if (args[0].length > 5) {
			return this.error(message.channel, `The prefix must be less than 6 characters. The prefix is the character that starts a command such as \`?\` or \`!\``);
		}

		if (args[0].replace(/ /g, '').endsWith('help')) {
			return this.error(message.channel, `The prefix is the character that starts a command such as \`?\` or \`!\``);
		}

		guildConfig.prefix = args[0];

		try {
			await this.dyno.guilds.update(guildConfig._id, { $set: { prefix: args[0] } });
			return this.success(message.channel, `Changed server prefix to ${args[0]}`);
		} catch (err) {
			this.logger.error(err);
			return this.error(message.channel, `Something went wrong. This probably isn't your fault.`, err);
		}
	}
}

module.exports = Prefix;

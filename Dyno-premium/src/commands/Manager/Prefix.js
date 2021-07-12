'use strict';

const Command = Loader.require('./core/structures/Command');

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

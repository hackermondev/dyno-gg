'use strict';

const Command = Loader.require('./core/structures/Command');

class Ignored extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['ignored'];
		this.group        = 'Moderator';
		this.description  = 'List channels and users where commands are ignored.';
		this.usage        = 'ignored';
		this.permissions  = 'serverMod';
		this.overseerEnabled = true;
		this.disableDM    = true;
		this.expectedArgs = 0;
	}

	execute({ message, args, guildConfig }) {
		let ignoredChannels = guildConfig.ignoredChannels || null,
			ignoredUsers = guildConfig.ignoredUsers || null;

		if (ignoredChannels) {
			ignoredChannels = ignoredChannels.map(id => message.guild.channels.get(id));
		}
		if (ignoredUsers) {
			ignoredUsers = ignoredUsers.map(id => message.guild.members.get(id));
		}

		const embed = {
			fields: [
				{ name: 'Ignored Channels', value: ignoredChannels ? ignoredChannels.map(c => `${c.mention}`).join('\n') : 'None' },
				{ name: 'Ignored Users', value: ignoredUsers ? ignoredUsers.map(u => `${u.mention} (${utils.fullName(u)})`) : 'None' },
			],
			timestamp: new Date(),
		};

		return this.sendMessage(message.channel, { embed });
	}
}

module.exports = Ignored;

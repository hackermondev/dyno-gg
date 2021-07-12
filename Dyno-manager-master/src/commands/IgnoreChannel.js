'use strict';

const {Command} = require('@dyno.gg/dyno-core');

class IgnoreChannel extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['ignorechannel'];
		this.group        = 'Manager';
		this.description  = 'Toggles command usage for a channel. (Does not affect mods and managers)';
		this.usage        = 'ignorechannel [channel]';
		this.permissions  = 'serverAdmin';
		this.overseerEnabled = true;
		this.disableDM    = true;
		this.expectedArgs = 1;
	}

	execute({ message, args, guildConfig }) {
		const channel = this.resolveChannel(message.guild, args[0]);
		if (!channel) {
			return this.error(message.channel, `Please provide a valid channel.`);
		}

		guildConfig.ignoredChannels = guildConfig.ignoredChannels || [];
		const index = guildConfig.ignoredChannels.indexOf(channel.id);
		if (index > -1) {
			guildConfig.ignoredChannels.splice(index, 1);
		} else {
			guildConfig.ignoredChannels.push(channel.id);
		}

		return this.dyno.guilds.update(message.guild.id, { $set: { 'ignoredChannels': guildConfig.ignoredChannels } })
			.then(() => this.success(message.channel, index > -1 ?
				`Removed ${channel.mention} from ignored channels. Commands can be used again.` :
				`Added ${channel.mention} to ignored channels. Commands will no longer be usable.`))
			.catch(() => this.error(message.channel, 'Something went wrong.'));
	}
}

module.exports = IgnoreChannel;

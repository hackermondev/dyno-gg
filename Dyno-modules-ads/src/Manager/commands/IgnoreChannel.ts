import { Command, CommandData } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class IgnoreChannel extends Command {
	public aliases     : string[] = ['ignorechannel'];
	public group       : string   = 'Manager';
	public description : string   = 'Toggles command usage for a channel. (Does not affect mods and managers)';
	public usage	   : string   = 'ignorechannel [channel]';
	public example	   : string   = 'ignorechannel #nobots';
	public permissions : string   = 'serverAdmin';
	public cooldown    : number   = 5000;
	public expectedArgs: number   = 1;

	public execute({ message, args, guildConfig }: CommandData) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		const channel = this.resolveChannel(guild, args[0]);
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

		return this.dyno.guilds.update(guild.id, { $set: { ignoredChannels: guildConfig.ignoredChannels } })
			.then(() => this.success(message.channel, index > -1 ?
				`Removed ${channel.mention} from ignored channels. Commands can be used again.` :
				`Added ${channel.mention} to ignored channels. Commands will no longer be usable.`))
			.catch(() => this.error(message.channel, 'Something went wrong.'));
	}
}

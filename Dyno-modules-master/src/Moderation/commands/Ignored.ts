import {Command} from '@dyno.gg/dyno-core';
import * as core from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import ModUtils from '../ModUtils';

export default class Ignored extends Command {
	public aliases        : string[] = ['ignored'];
	public group          : string   = 'Moderator';
	public module         : string   = 'Moderation';
	public description    : string   = 'List channels and users where commands are ignored.';
	public usage          : string   = 'ignored';
	public example        : string   = 'ignored';
	public permissions    : string   = 'serverMod';
	public overseerEnabled: boolean  = true;
	public cooldown       : number   = 6000;
	public expectedArgs   : number   = 0;

	public execute({ message, args, guildConfig }: core.CommandData) {
		let ignoredChannels = guildConfig.ignoredChannels || null;
		let ignoredRoles = guildConfig.ignoredRoles || null;
		const ignoredUsers = guildConfig.ignoredUsers || null;

		const guild = (<eris.GuildChannel>message.channel).guild;

		if (ignoredChannels) {
			ignoredChannels = ignoredChannels.map((id: string) => guild.channels.get(id));
		}
		if (ignoredRoles) {
			ignoredRoles = ignoredRoles.map((id: string) => guild.roles.get(id));
		}

		const embed = {
			fields: [
				{
					name: 'Ignored Channels',
					value: ignoredChannels && ignoredChannels.length ? ignoredChannels.map((c: eris.GuildChannel) => `<#${c.id}>`).join('\n') : 'None',
				},
				{
					name: 'Ignored Roles',
					value: ignoredRoles && ignoredRoles.length ? ignoredRoles.map((r: eris.Role) => `<@&${r.id}>`).join('\n') : 'None',
				},
				{
					name: 'Ignored Users',
					value: ignoredUsers && ignoredUsers.length ?
						ignoredUsers.map((u: eris.User) => `<@!${u.id}> (${this.utils.fullName(u)})`).join('\n') : 'None',
				},
			],
			timestamp: (new Date()).toISOString(),
		};

		return this.sendMessage(message.channel, { embed: embed });
	}
}

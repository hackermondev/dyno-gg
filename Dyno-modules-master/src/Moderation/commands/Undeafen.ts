import {Command} from '@dyno.gg/dyno-core';
import * as core from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import ModUtils from '../ModUtils';

export default class Undeafen extends Command {
	public aliases            : string[] = ['undeafen'];
	public group              : string   = 'Moderator';
	public module             : string   = 'Moderation';
	public description        : string   = 'Undeafen a member';
	public usage              : string   = 'undeafen [user]';
	public example            : string   = 'undeafen @NoobLance';
	public permissions        : string   = 'serverMod';
	public cooldown           : number   = 3000;
	public expectedArgs       : number   = 1;
	public requiredPermissions: string[] = ['deafenMembers'];

	public async execute({ message, args, guildConfig }: core.CommandData) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		const modUtils = new ModUtils(this.dyno, guild);
		const member : any = this.resolveUser(guild, args[0]);
		const reason = args.length > 1 ? args.slice(1).join(' ') : null;

		if (!member) {
			return this.error(message.channel, `Couldn't find user ${args[0]}.`);
		}

		if (member === this.client.user || member === message.author) {
			return this.error(message.channel, `I can't undeafen ${this.utils.fullName(member)}`);
		}

		if (!member.voiceState || !member.voiceState.channelID) {
			return this.error(message.channel, `User needs to be in a voice channel.`);
		}

		try {
			await this.client.editGuildMember(guild.id, member.id, { deaf: false });
				modUtils.log({
					type: 'Undeafen',
					user: member,
					guild: guild,
					mod: message.author,
					guildConfig,
					reason,
				});
				return this.success(message.channel, `${this.utils.fullName(member)} was undeafened.`);
		} catch (err) {
			this.error(message.channel, `I can't undeafen ${this.utils.fullName(member)}`, err);
		}
	}
}

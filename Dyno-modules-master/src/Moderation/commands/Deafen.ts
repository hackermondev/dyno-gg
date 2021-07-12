import {Command} from '@dyno.gg/dyno-core';
import * as core from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import ModUtils from '../ModUtils';

export default class Deafen extends Command {
	public aliases            : string[] = ['deafen'];
	public group              : string   = 'Moderator';
	public module             : string   = 'Moderation';
	public description        : string   = 'Deafen a member';
	public usage              : string   = 'deafen [user]';
	public example            : string   = 'deafen @NoobLance';
	public permissions        : string   = 'serverMod';
	public disableDM          : boolean  = true;
	public cooldown           : number   = 3000;
	public expectedArgs       : number   = 1;
	public requiredPermissions: string[] = ['voiceDeafenMembers'];

	public async execute({ message, args, guildConfig }: core.CommandData) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		const modUtils = new ModUtils(this.dyno, guild);
		const member : any = this.resolveUser(guild, args[0], null, true);
		const reason = args.length > 1 ? args.slice(1).join(' ') : null;

		if (!member) {
			return this.error(message.channel, `Couldn't find user ${args[0]}.`);
		}

		if (!member.voiceState || !member.voiceState.channelID) {
			return this.error(message.channel, `User needs to be in a voice channel.`);
		}

		try {
			await this.client.editGuildMember(guild.id, member.id, { deaf: true });
				modUtils.log({
					type: 'Deafen',
					user: member,
					guild: guild,
					mod: message.author,
					guildConfig,
					reason,
				});
				return this.success(message.channel, `${this.utils.fullName(member)} was deafened.`);
		} catch (err) {
			console.error(err);
			this.error(message.channel, `I can't deafen ${this.utils.fullName(member)}`, err);
		}
	}
}

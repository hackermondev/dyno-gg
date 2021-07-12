import { Command, CommandData } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import ModUtils from '../ModUtils';

export default class IgnoreUser extends Command {
	public aliases        : string[] = ['ignoreuser'];
	public group          : string   = 'Manager';
	public module         : string   = 'Moderation';
	public description    : string   = 'Toggles command usage for a user.';
	public usage          : string   = 'ignoreuser [user] [reason]';
	public example        : string   = 'ignoreuser @user spamming commands in general';
	public permissions    : string   = 'serverAdmin';
	public overseerEnabled: boolean  = true;
	public cooldown       : number   = 3000;
	public expectedArgs   : number   = 1;

	public execute({ message, args, guildConfig }: CommandData) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		const modUtils = new ModUtils(this.dyno, guild);
		const user = this.resolveUser(guild, args[0], null, true);
		const reason = args.length > 1 ? args.slice(1).join(' ') : null;

		if (!user) {
			return this.error(message.channel, `I couldn't find that user`);
		}

		if (this.isServerMod(<eris.Member>user, message.channel)) {
			return this.error(message.channel, `That user is a mod or admin.`);
		}

		guildConfig.ignoredUsers = guildConfig.ignoredUsers || [];
		const index = guildConfig.ignoredUsers.findIndex((u: any) => u.id === user.id);
		if (index > -1) {
			guildConfig.ignoredUsers.splice(index, 1);
		} else {
			guildConfig.ignoredUsers.push({
				id: user.id,
				username: user.username,
				discriminator: user.discriminator,
			});
		}

		return this.dyno.guilds.update(guild.id, { $set: { ignoredUsers: guildConfig.ignoredUsers } })
			.then(() => {
				const color = index > -1 ? this.utils.getColor('green') : this.utils.getColor('orange');
				const type = index > -1 ? 'Unignore User' : 'Ignore User';

				modUtils.log({
					guild: guild,
					user: user,
					mod: message.member,
					type: type,
					reason: reason,
					guildConfig: guildConfig,
					colorOverride: color,
				});
				return this.success(message.channel, index > -1 ?
					`Removed ${this.utils.fullName(user)} from ignored users. Commands can be used again.` :
					`Added ${this.utils.fullName(user)} to ignored users. Commands will no longer be usable.`);
			})
			.catch(() => this.error(message.channel, 'Something went wrong.'));
	}
}

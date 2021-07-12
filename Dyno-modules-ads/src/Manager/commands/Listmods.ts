import { Command, CommandData } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Listmods extends Command {
	public aliases     : string[] = ['listmods'];
	public group       : string   = 'Manager';
	public description : string   = 'List moderators';
	public usage	   : string   = 'listmods';
	public example	   : string   = 'listmods';
	public permissions : string   = 'serverAdmin';
	public cooldown    : number   = 5000;
	public expectedArgs: number   = 0;

	public execute({ message, guildConfig }: CommandData) {
		const msgArray = [];

		if (!guildConfig) {
			return this.error(message.channel, 'No settings found for this server.');
		}

		const guild = (<eris.GuildChannel>message.channel).guild;

		const embed = this.buildEmbed({
			fields: [],
		}, true);

		const admins = guild.members.filter((m: eris.Member) => this.isServerAdmin(m, message.channel));

		embed.fields.push({
			name: 'Admins',
			value: admins
				.filter((m: eris.Member) => !m.bot)
				.map((m: eris.Member) => m.mention)
				.join('\n'),
		});

		if (guildConfig.modRoles && guildConfig.modRoles.length) {
			embed.fields.push({
				name: 'Mod Roles',
				value: guildConfig.modRoles
					.filter((id: string) => guild.roles.has(id))
					.map((id: string) => guild.roles.get(id).mention)
					.join('\n'),
			});
		}

		if (guildConfig.mods && guildConfig.mods.length) {
			const mods = guildConfig.mods
				// .filter(id => guild.members.has(id))
				.map((id: string) => {
					const member = guild.members.get(id);
					return member ? member.mention : `${id} (Left server)`;
				})
				.join('\n');

			if (mods && mods.length) {
				embed.fields.push({
					name: 'Moderators',
					value: mods,
				});
			}
		}

		return this.sendMessage(message.channel, { embed });
	}
}

import { Command } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as dyno from 'Dyno';

export default class Top extends Command {
	public group: string = 'Misc';
	public aliases: string[] = ['top'];
	public description: string = 'Check your guild top ranked members';
	public defaultUsage: string = 'top';
	public expectedArgs: number = 0;
	public cooldown: number = 6000;
	public disableDM: boolean = true;
	public usage: string = 'top';
	public example: string = 'top';

	public async execute({ message, args, guildConfig } : any): Promise<any> {
		try {
			const levelsranks = this.dyno.modules.get('LevelsRanks');
			const guildrank = levelsranks._guildrank;
			const channel = <eris.GuildChannel> message.channel;
			const guild = channel.guild;

			const top = await levelsranks.getGuildTop(guild.id);
			const guildMembers = channel.guild.members;

			let response = '**Top 10 Members**\n\n';

			top.forEach((el: any, index: number) => {
				const member: eris.Member = guildMembers.get(el.member);
				const name = member ? `${member.username}#${member.discriminator}` : `<Unknown Member>`;

				response += `**${index + 1}. ${name}** Level ${guildrank.calcLevel(el.points)} [${el.points} pts]\n\n`;
			});

			const embed: eris.MessageContent = {
				embed: {
					description: response,
					color: 2460652,
					timestamp: new Date().toISOString(),
					footer: {
						text: 'Leaderboard as of',
					},
					thumbnail: {
						url: 'https://image.flaticon.com/icons/png/512/518/518615.png',
					},
					author: {
						name: guild.name,
						icon_url: guild.iconURL,
					},
				},
			};
			return this.sendMessage(channel, embed);
		} catch (e) {
			this.logger.error(e);
		}
	}
}

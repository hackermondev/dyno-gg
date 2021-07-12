import { Command } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as dyno from 'Dyno';

export default class Placing extends Command {
	public group: string = 'Misc';
	public aliases: string[] = ['placing', 'myrank', 'rankme', 'guildrank'];
	public description: string = 'Check your guild rank position';
	public defaultUsage: string = 'placing';
	public expectedArgs: number = 0;
	public cooldown: number = 6000;
	public disableDM: boolean = true;
	public usage: string = 'placing';
	public example: string = 'placing';

	public async execute({ message, args, guildConfig } : any): Promise<any> {
		try {
			const userId = message.author.id;
			const channel = <eris.GuildChannel> message.channel;
			const guild = channel.guild;

			const levelsranks = this.dyno.modules.get('LevelsRanks');
			const guildrank = levelsranks._guildrank;

			const placing = await levelsranks.getGuildRank(userId, guild.id);

			const embed : eris.MessageContent = {
				embed: {
					color: 2460652,
					timestamp: new Date().toISOString(),
					footer: {
						text: 'Rank as of',
					},
					thumbnail: {
						url: message.author.avatarURL,
					},
					author: {
						name: guild.name,
						icon_url: guild.iconURL,
					},
					fields: [
						{
							name: `__Rank for ${message.author.username}#${message.author.discriminator}__`,
							value: `You currently have: **__${placing.points} points__**\nYour position is: **__${placing.position || placing.count}/${placing.count}__**\nYour level is ${guildrank.calcLevel(placing.points)}`,
						},
					],
				},
			};

			return this.sendMessage(channel, embed);
		} catch (e) {
			this.logger.error(e);
		}
	}
}

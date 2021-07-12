import {Command, CommandData} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as moment from 'moment-timezone';
import ModUtils from '../ModUtils';

export default class Warnings extends Command {
	public aliases: string[]         = ['warnings'];
	public group: string           = 'Moderator';
	public module: string          = 'Moderation';
	public description: string     = 'Get warnings for a user';
	public usage: string           = 'warnings [user]';
	public example: string         = 'warnings NoobLance';
	public permissions: string     = 'serverMod';
	public overseerEnabled: boolean = true;
	public cooldown: number        = 4000;
	public expectedArgs: number    = 1;

	public async execute({ message, args, guildConfig }: CommandData) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		let user;
		let userid;
		if (args.length) {
			const test: any = args.join(' ');
			user = this.resolveUser(guild, test);
			if (!user && isNaN(test)) {
				return this.error(message.channel, `I can't find user ${test}.`);
			} else if (!user) {
				userid = test;
			} else {
				userid = user.id;
			}
		}

		let warnings;

		warnings = await this.models.Warning.find({ guild: guild.id, 'user.id': userid }).sort({ createdAt: -1 }).lean().exec();

		if (!warnings || !warnings.length) {
			return this.info(message.channel, `There are no warnings.`);
		}

		const count = warnings.length;

		if (warnings.length > 10) {
			warnings = warnings.slice(0, 10);
		}

		if (!user && warnings && warnings.length) {
			user = new eris.User(warnings[0].user, this.client);
		}

		const embed: eris.EmbedOptions = {
			color: this.utils.hexToInt('E86B6B'),
			author: {
				name: `${count} Warnings for ${user && this.utils.fullName(user)} (${userid})`,
			},
			fields: warnings.map((warning: any) => {
				return {
					name: `ID: ${warning._id} | Moderator: ${this.utils.fullName(warning.mod)}`,
					value: `${warning.reason} - ${moment(warning.createdAt).tz(guildConfig.timezone || 'America/New_York').format('MMM DD YYYY')}`,
				};
			}),
		};

		if (user) {
			embed.author.icon_url = user.avatarURL;
		}

		return this.sendMessage(message.channel, { embed });
	}
}

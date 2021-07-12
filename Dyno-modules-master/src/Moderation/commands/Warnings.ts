import {Command} from '@dyno.gg/dyno-core';
import * as core from '@dyno.gg/dyno-core';
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

	public async execute({ message, args, guildConfig }: core.CommandData) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		let user;
		if (args.length) {
			user = this.resolveUser(guild, args.join(' '));
			if (!user) {
				return this.error(message.channel, `I can't find user ${args.join(' ')}.`);
			}
		}

		let warnings;

		if (user) {
			warnings = await this.models.Warning.find({ guild: guild.id, 'user.id': user.id }).sort({ createdAt: -1 }).lean().exec();
		} else {
			warnings = await this.models.Warning.find({ guild: guild.id }).sort({ createdAt: -1 }).lean().exec();
		}

		if (!warnings || !warnings.length) {
			return this.sendMessage(message.channel, `There are no warnings.`);
		}

		const count = warnings.length;

		if (warnings.length > 10) {
			warnings = warnings.slice(0, 10);
		}

		const embed = {
			color: this.utils.hexToInt('E86B6B'),
			author: {
				name: `${count} Warnings for ${this.utils.fullName(user)} (${user.id})`,
				icon_url: user.avatarURL,
			},
			fields: warnings.map((warning: any) => {
				return {
					name: `ID: ${warning._id} | Moderator: ${this.utils.fullName(warning.mod)}`,
					value: `${warning.reason} - ${moment(warning.createdAt).tz(guildConfig.timezone || 'America/New_York').format('MMM DD YYYY')}`,
				};
			}),
		};

		return this.sendMessage(message.channel, { embed });
	}
}

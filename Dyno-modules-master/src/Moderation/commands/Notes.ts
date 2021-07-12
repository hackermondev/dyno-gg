import {Command} from '@dyno.gg/dyno-core';
import * as core from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as moment from 'moment-timezone';
import ModUtils from '../ModUtils';

export default class Notes extends Command {
	public aliases: string[]         = ['notes'];
	public group: string           = 'Moderator';
	public module: string          = 'Moderation';
	public description: string     = 'Get notes for a user';
	public usage: string           = 'notes [user]';
	public example: string         = 'notes NoobLance';
	public permissions: string     = 'serverMod';
	public overseerEnabled: boolean = true;
	public cooldown: number        = 10000;
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

		const doc = await this.models.Note.findOne({ guild: guild.id, userid: user.id }).lean().exec();

		if (!doc || !doc.notes || !doc.notes.length) {
			return this.sendMessage(message.channel, `There are no notes for this user.`);
		}

		const embed = {
			color: this.utils.hexToInt('E86B6B'),
			author: {
				name: `Notes for ${this.utils.fullName(user)} (${user.id})`,
				icon_url: user.avatarURL,
			},
			fields: doc.notes.map((note: any, index: string) => {
				return {
					name: `ID: ${parseInt(index, 10) + 1} | Moderator: ${this.utils.fullName(note.mod)}`,
					value: `${note.note} - ${moment(note.createdAt).tz(guildConfig.timezone || 'America/New_York').format('MMM DD YYYY')}`,
				};
			}),
		};

		return this.sendMessage(message.channel, { embed });
	}
}

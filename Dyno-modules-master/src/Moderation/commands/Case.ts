import {Command} from '@dyno.gg/dyno-core';
import * as core from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as moment from 'moment-timezone';
import ModUtils from '../ModUtils';

export default class Case extends Command {
	public aliases        : string[] = ['case'];
	public group          : string   = 'Moderator';
	public module         : string   = 'Moderation';
	public description    : string   = 'Show a single mod log case';
	public usage          : string   = 'case [Case ID]';
	public example        : string   = 'case 1234';
	public permissions    : string   = 'serverMod';
	public overseerEnabled: boolean  = true;
	public cooldown       : number   = 3000;
	public expectedArgs   : number   = 1;

	public async execute({ message, args, guildConfig }: core.CommandData) {
		let log;

		const guild = (<eris.GuildChannel>message.channel).guild;

		if (isNaN(args[0])) {
			return this.error(message.channel, 'Please use a valid case number.');
		}

		try {
			log = await this.models.ModLog.findOne({
				caseNum: args[0],
				server: guild.id,
			}).lean();
		} catch (err) {
			return this.error(message.channel, `I'm unable to get logs at this time.`, err);
		}

		if (!log) {
			return this.sendMessage(message.channel, `Case ${args[0]} not found.`);
		}

		const colorMap = [
			['ban', this.utils.getColor('red')],
			['softban', this.utils.getColor('red')],
			['mute', this.utils.getColor('orange')],
			['kick', this.utils.getColor('red')],
			['warn', this.utils.getColor('yellow')],
			['unban', this.utils.getColor('yellow')],
			['unmute', this.utils.getColor('green')],
			['clearwarn', this.utils.getColor('green')],
			['role', this.utils.getColor('yellow')],
		];

		const { caseNum, limit, mod, reason, role, type, user } = log;

		const userString = typeof user === 'string' ? user : this.utils.fullName(user);
		const modtype = type.split(' ').shift().toLowerCase();

		const foundColor = colorMap.find((c: any[]) => modtype.startsWith(c[0]));
		let color = foundColor ? foundColor[1] : this.utils.getColor('orange');

		const embed = {
			color: color,
			author: { name: `Case ${caseNum} | ${type} | ${userString}` },
			fields: [
				{ name: 'User', value: `${user.mention || this.utils.fullName(user)}`, inline: true },
				{ name: 'Moderator', value: mod ? `<@${mod.id}>` : `<@${this.dyno.userid}>`, inline: true },
			],
			footer: { text: `ID: ${user.id}` },
			timestamp: (new Date()).toISOString(),
		};

		if (limit) {
			embed.fields.push({ name: 'Length', value: `${limit} minutes`, inline: true });
		}
		if (role) {
			embed.fields.push({ name: 'Role', value: `${role.name}`, inline: true });
		}
		if (reason) {
			embed.fields.push({ name: 'Reason', value: reason, inline: true });
		}

		return this.sendMessage(message.channel, { embed });
	}
}

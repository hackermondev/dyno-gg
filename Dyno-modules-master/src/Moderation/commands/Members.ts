import {Command} from '@dyno.gg/dyno-core';
import * as core from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import ModUtils from '../ModUtils';

export default class Members extends Command {
	public aliases        : string[] = ['members'];
	public group          : string   = 'Moderator';
	public module         : string   = 'Moderation';
	public description    : string   = 'List members in a role(s) (max 90)';
	public usage          : string   = 'members [role]';
	public example        : string[] = [
		'members Staff',
		'members Staff, Updates',
		'members Staff not Mod',
	];
	public permissions    : string   = 'serverMod';
	public overseerEnabled: boolean  = true;
	public cooldown       : number   = 6000;
	public expectedArgs   : number   = 1;

	public execute({ message, args, guildConfig }: core.CommandData) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		let inRoles: any;
		let outRoles: any;

		[inRoles, outRoles] = args.join(' ').replace(/, /g, ',').split(' not ');

		inRoles = inRoles ? inRoles.split(',') : [];
		outRoles = outRoles ? outRoles.split(',') : [];

		inRoles = inRoles.map((r: string) => this.resolveRole(guild, r)).filter((role: eris.Role) => !!role);

		if (!inRoles || !inRoles.length) {
			return this.error(message.channel, `I couldn't find that role.`);
		}

		if (outRoles) {
			outRoles = outRoles.map((r: string) => this.resolveRole(guild, r)).filter((role: eris.Role) => !!role);
		}

		let members = guild.members.filter((m: eris.Member) =>
			inRoles.filter((r: eris.Role) => m.roles.includes(r.id)).length === inRoles.length);
		members = members.filter((m: eris.Member) => outRoles.filter((r: eris.Role) => m.roles.includes(r.id)).length === 0);

		if (!members || !members.length) {
			return this.sendMessage(message.channel, 'There are no members that met your search.');
		}

		if (members.length > 90) {
			return this.error(message.channel, `There's too many members to show.`);
		}

		const index = members.length > 1 ? Math.ceil(members.length / 2) : null;
		const memberArray = members.map((m: eris.Member) => `<@${m.id}>`);

		const embed = {
			title: `Members in ${inRoles.map((r: eris.Role) => r.name).join(', ')}`,
			fields: [],
		};

		if (outRoles && outRoles.length) {
			embed.title += ` and not in ${outRoles.map((r: eris.Role) => r.name)}`;
		}

		if (index) {
			embed.fields.push({ name: '\u200B', value: memberArray.slice(0, index).join('\n'), inline: true });
			embed.fields.push({ name: '\u200B', value: memberArray.slice(index).join('\n'), inline: true });
		} else {
			embed.fields.push({ name: '\u200B', value: memberArray.join('\n'), inline: true });
		}

		return this.sendMessage(message.channel, { embed });
	}
}

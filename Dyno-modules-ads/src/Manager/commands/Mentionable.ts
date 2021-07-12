import { Command, CommandData } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Mentionable extends Command {
	public aliases     : string[] = ['mentionable'];
	public group       : string   = 'Manager';
	public description : string   = 'Toggle making a role mentionable on/off';
	public usage	   : string   = 'mentionable [role name]';
	public example	   : string   = 'mentionable Staff';
	public permissions : string   = 'serverAdmin';
	public cooldown    : number   = 5000;
	public expectedArgs: number   = 1;
	public requiredPermissions: string[] = ['manageRoles'];

	public async execute({ message, args }: CommandData) {
		let mentionable;
		let rolename;

		const guild = (<eris.GuildChannel>message.channel).guild;

		if (['true', 'false'].includes(args[args.length - 1])) {
			mentionable = args[args.length - 1] === 'true' ? true : false; // eslint-disable-line
			rolename = args.slice(0, args.length - 1).join(' ');
		}

		const role = this.resolveRole(guild, rolename || args.join(' '));

		if (!role) {
			return this.error(message.channel, `Couldn't find that role.`);
		}

		mentionable = (mentionable !== undefined) ? mentionable : !role.mentionable;

		return role.edit({ mentionable: mentionable })
			.then(() => this.success(message.channel, `Made the ${role.name} role ${mentionable ? 'mentionable' : 'unmentionable'}`))
			.catch(() => this.error(message.channel, `I couldn't make changes to that role.`));
	}
}

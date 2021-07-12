import { Command, CommandData } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Addrole extends Command {
	public aliases     : string[] = ['addrole'];
	public group       : string   = 'Manager';
	public description : string   = 'Add a new role, with optional color and hoist.';
	public usage	   : string   = 'addrole [name] [hex color] [hoist]';
	public example	   : string   = 'addrole Test #FF0000 true';
	public permissions : string   = 'serverAdmin';
	public cooldown    : number   = 5000;
	public expectedArgs: number   = 1;
	public requiredPermissions: string[] = ['manageRoles'];

	public async execute({ message, args }: CommandData) {
		const options: any = {};

		if (args.length > 1 && ['true', 'yes'].includes(args[args.length - 1].toLowerCase())) {
			options.hoist = args.pop();
		}

		if (args.length > 1 && args[args.length - 1].match(/^#?([a-f\d]{3}){1,2}\b/i)) {
			options.color = this.utils.hexToInt(args.pop());
		}

		options.name = args.join(' ');

		if (!options.name) {
			return this.error(message.channel, 'Please give a role name.');
		}

		try {
			await this.createRole((<eris.GuildChannel>message.channel).guild, options);
			return this.success(message.channel, `Created role ${options.name}`);
		} catch (err) {
			return this.error(message.channel, `I can't create that role. I may not have manage roles permissions.`);
		}
	}
}

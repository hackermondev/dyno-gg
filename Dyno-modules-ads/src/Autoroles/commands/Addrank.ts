import {Command} from '@dyno.gg/dyno-core';
import * as core from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

/**
 * Addrank command
 * @class Addrank
 * @extends Command
 */
export default class Addrank extends Command {
	public aliases            : string[] = ['addrank'];
	public group              : string   = 'Roles';
	public module             : string   = 'Autoroles';
	public description        : string   = 'Add a new rank for members to join, works with existing or new roles.';
	public usage              : string   = 'addrank [name] (hex color) (hoist)';
	public example            : string   = 'addrank Team Mystic #0677ef true';
	public permissions        : string   = 'serverAdmin';
	public cooldown           : number   = 8000;
	public expectedArgs       : number   = 1;
	public requiredPermissions: string[] = ['manageRoles'];

	public async execute({ message, args }: core.CommandData): Promise<{}> {
		const Autoroles = this.dyno.modules.get('Autoroles');
		const guild = (<eris.TextChannel>message.channel).guild;

		const role = guild.roles.find((r: eris.Role) =>
			r.name.toLowerCase() === args.join(' ').toLowerCase());

		if (role) {
			try {
				await Autoroles.ranks.createRank(guild, role, role.name);
				return this.success(message.channel, `Created rank ${role.name}`);
			} catch (err) {
				return this.error(message.channel, `I can't create that rank.`, err);
			}
		}

		const options = {
			hoist: false,
			color: null,
			name: null,
		};

		if (['true', 'yes'].includes(args[args.length - 1].toLowerCase())) {
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
			const r = await this.createRole(guild, options);
			await Autoroles.ranks.createRank(guild, r, options.name);
			return this.success(message.channel, `Created rank ${options.name}`);
		} catch (err) {
			return this.error(message.channel, `I can't create that rank.`, err);
		}
	}
}

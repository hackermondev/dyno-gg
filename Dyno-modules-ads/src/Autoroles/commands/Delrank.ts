import {Command} from '@dyno.gg/dyno-core';
import * as core from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

/**
 * Delrank command
 * @class Delrank
 * @extends Command
 */
export default class Delrank extends Command {
	public aliases            : string[] = ['delrank'];
	public group              : string   = 'Roles';
	public module             : string   = 'Autoroles';
	public description        : string   = 'Delete an existing rank, does not delete the role.';
	public usage              : string   = 'delrank [rank name]';
	public example            : string   = 'delrank Mystic';
	public permissions        : string   = 'serverAdmin';
	public cooldown           : number   = 8000;
	public expectedArgs       : number   = 1;
	public requiredPermissions: string[] = ['manageRoles'];

	public async execute({ message, args }: core.CommandData): Promise<{}> {
		const Autoroles = this.dyno.modules.get('Autoroles');

		const roleName = args.join(' ');

		try {
			await Autoroles.ranks.deleteRank((<eris.TextChannel>message.channel).guild, roleName);
			return this.success(message.channel, `Deleted rank ${roleName}`);
		} catch (err) {
			return this.error(message.channel, `I can't delete that rank.`);
		}
	}
}

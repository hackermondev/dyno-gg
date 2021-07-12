import * as eris from '@dyno.gg/eris';
import GuildRank from './GuildRank';

export default class LeveledRoles {
	public module: any;
	private guildrank : GuildRank;

	public constructor(module : any) {
		this.module = module;
		this.guildrank = module._guildrank;
	}

	public async checkRoleRequirements(member: eris.Member, points: number, guildConfig: any): Promise<void> {
		if (!guildConfig || !guildConfig.leveledRoles || !guildConfig.leveledRoles.roles) {
			return;
		}
		const leveledRoles = guildConfig.leveledRoles.roles;
		const onlyOneRole = guildConfig.leveledRoles.onlyOneRole;

		// We EXPECT the leveledRoles array to be ordered by points, descending
		const memberRoles = member.roles.slice(0);
		const lvl = this.guildrank.calcLevel(points);

		let newRoleAssigned = false;

		for (const role of leveledRoles) {
			if (memberRoles.includes(role.id)) {
				if (newRoleAssigned && onlyOneRole) {
					memberRoles.filter((i: string) => i !== role.id);
				}
			} else if (lvl >= role.level) {
				memberRoles.push(role.id);
				newRoleAssigned = true;
			}
		}

		if (newRoleAssigned) {
			await this.module.client.editGuildMember(guildConfig._id, member.id, { roles: memberRoles }, 'Dyno Leveled Roles');
		}
	}
}

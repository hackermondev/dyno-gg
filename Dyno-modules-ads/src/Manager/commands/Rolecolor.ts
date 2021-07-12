import { Command, CommandData } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Rolecolor extends Command {
	public aliases     : string[] = ['rolecolor', 'rolecolour'];
	public group       : string   = 'Manager';
	public description : string   = 'Change the color of a role.';
	public usage	   : string   = 'rolecolor [role] [hex color]';
	public example	   : string   = 'rolecolor Admin 000001';
	public permissions : string   = 'serverAdmin';
	public cooldown    : number   = 6000;
	public expectedArgs: number   = 2;
	public requiredPermissions: string[] = ['manageRoles'];

	public async execute({ message, args }: CommandData) {
		let hexColor = args.pop();

		if (hexColor === 'random') {
			// tslint:disable-next-line:prefer-template
			hexColor = ('00000' + (Math.random() * (1 << 24) | 0).toString(16)).slice(-6);
		}

		const color = this.utils.hexToInt(hexColor);
		const role = this.resolveRole((<eris.GuildChannel>message.channel).guild, args.join(' '));

		if (!role) {
			return this.error(message.channel, `Couldn't find that role.`);
		}

		return role.edit({ color: color })
			.then(() => this.sendMessage(message.channel, {
				embed: { color: color, description: `Changed the role color for ${role.name} to #${hexColor}` },
			}))
			.catch(() => this.error(message.channel, `I couldn't make changes to that role.`));
	}
}

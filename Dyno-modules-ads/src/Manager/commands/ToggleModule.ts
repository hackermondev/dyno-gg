import { Command, CommandData } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class ToggleModule extends Command {
	public aliases     : string[] = ['module'];
	public group       : string   = 'Manager';
	public description : string   = 'Enable/disable a module.';
	public usage	   : string   = 'module [module name]';
	public example	   : string   = 'module Fun';
	public permissions : string   = 'serverAdmin';
	public overseerEnabled: boolean  = true;
	public cooldown    : number   = 5000;
	public expectedArgs: number   = 1;

	public execute({ message, args, guildConfig }: CommandData) {
		const module = this.dyno.modules.find((c: any) =>
			c.module.toLowerCase() === args.join(' ').toLowerCase() ||
			(c.friendlyName && c.friendlyName.toLowerCase() === args.join(' ').toLowerCase()));

		if (!guildConfig) {
			return this.error(message.channel, 'No settings for this server.');
		}

		if (!module || module.adminEnabled === true || module.admin === true || module.core === true || module.list === false) {
			return this.error(message.channel, `I can't find the ${args.join(' ')} module`);
		}

		if (!guildConfig.isPremium && module.vipOnly) {
			return this.error(message.channel, `I can't find the ${args.join(' ')} module`);
		}

		const key = `modules.${module.name}`;

		guildConfig.modules[module.name] = !guildConfig.modules[module.name];

		return this.dyno.guilds.update(guildConfig._id, { $set: { [key]: guildConfig.modules[module.name] } })
			.then(() => this.success(message.channel, guildConfig.modules[module.name] ?
				`Enabled ${module.name}` : `Disabled ${module.name}`))
			.catch(() => this.error(message.channel, 'Something went wrong.'));
	}
}

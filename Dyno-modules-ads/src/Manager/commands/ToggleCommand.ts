import { Command, CommandData } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class ToggleCommand extends Command {
	public aliases     : string[] = ['command'];
	public group       : string   = 'Manager';
	public description : string   = 'Enable/disable a command.';
	public usage	   : string   = 'command [command name]';
	public example	   : string   = 'command rolename';
	public permissions : string   = 'serverAdmin';
	public overseerEnabled: boolean  = true;
	public cooldown    : number   = 5000;
	public expectedArgs: number   = 1;

	public execute({ message, args, guildConfig }: CommandData) {
		const command = this.dyno.commands.find((c: any) => c.name.toLowerCase() === args[0]);

		if (!guildConfig) {
			return this.error(message.channel, 'No settings for this server.');
		}

		if (!command) {
			return this.error(message.channel, `I can't find the ${args[0]} command`);
		}

		if (command.noDisable) {
			return this.error(message.channel, `I can't disable the ${args[0]} command`);
		}

		const key = `commands.${args[0]}`;

		guildConfig.commands[command.name] = guildConfig.commands[command.name] || {};

		if (typeof guildConfig.commands[command.name] === 'boolean') {
			guildConfig.commands[command.name] = !guildConfig.commands[command.name];
		} else if (typeof guildConfig.commands[command.name] === 'object') {
			guildConfig.commands[command.name].enabled = !guildConfig.commands[command.name].enabled;
		} else {
			guildConfig.commands[command.name] = true;
		}

		return this.dyno.guilds.update(guildConfig._id, { $set: { [key]: guildConfig.commands[command.name] } })
			.then(() => this.success(message.channel, guildConfig.commands[command.name] ?
				`Enabled ${command.name}` : `Disabled ${command.name}`))
			.catch(() => this.error(message.channel, 'Something went wrong.'));
	}
}

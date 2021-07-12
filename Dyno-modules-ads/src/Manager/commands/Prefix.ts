import { Command, CommandData } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Prefix extends Command {
	public aliases     : string[] = ['prefix'];
	public group       : string   = 'Manager';
	public description : string   = 'Get or set the command prefix for this server.';
	public usage	   : string   = 'prefix (prefix)';
	public example	   : string[] = ['prefix', 'prefix -'];
	public permissions : string   = 'serverAdmin';
	public cooldown    : number   = 5000;
	public expectedArgs: number   = 0;
	public overseerEnabled: boolean = true;

	public async execute({ message, args, guildConfig }: CommandData) {
		if (!args.length) {
			return this.info(message.channel, `The prefix for this server is \`${guildConfig.prefix}\``);
		}

		if (args[0].length > 5) {
			return this.error(message.channel,
				`The prefix must be less than 6 characters. The prefix is the character that starts a command such as \`?\` or \`!\``);
		}

		if (args[0].replace(/ /g, '').endsWith('help')) {
			return this.info(message.channel, `The prefix is the character that starts a command such as \`?\` or \`!\``);
		}

		guildConfig.prefix = args[0];

		try {
			await this.dyno.guilds.update(guildConfig._id, { $set: { prefix: args[0] } });
			return this.success(message.channel, `Changed server prefix to ${args[0]}`);
		} catch (err) {
			this.logger.error(err);
			return this.error(message.channel, `Something went wrong. This probably isn't your fault.`, err);
		}
	}
}

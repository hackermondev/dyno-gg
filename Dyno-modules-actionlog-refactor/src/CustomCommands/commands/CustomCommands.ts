import {Command} from '@dyno.gg/dyno-core';
import * as core from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class CustomCommands extends Command {
	public aliases: string[]        = ['customs', 'cc'];
	public group: string          = 'Manager';
	public module: string         = 'CustomCommands';
	public description: string    = 'List, enable, disable custom commands.';
	public defaultUsage: string   = 'customs';
	public defaultCommand: string = 'list';
	public permissions: string    = 'serverMod';
	public cooldown: number       = 5000;
	public expectedArgs: number   = 0;

	public commands: core.SubCommand[] = [
		{ name: 'list', desc: 'List custom commands', usage: 'customs list' },
		{ name: 'enable', desc: 'Enable a custom command', usage: 'customs enable [command]' },
		{ name: 'disable', desc: 'Disable a custom command', usage: 'customs disable [command]' },
	];

	public usage: string[] = [
		'customs enable [command]',
		'customs disable [command]',
		'customs list',
	];

	public example: string[] = [
		'customs disable mycommand',
		'customs enable mycommand',
	];

	public async execute() {
		return Promise.resolve();
	}

	public list({ message, args, guildConfig }: core.CommandData) {
		if (!guildConfig.customcommands || !guildConfig.customcommands.commands) {
			return this.sendMessage(message.channel, `There are no custom commands on this server.`);
		}

		if (Object.keys(guildConfig.customcommands.commands).length === 0) {
			return this.sendMessage(message.channel, `There are no custom commands on this server.`);
		}

		const enabledCommands = Object.values(guildConfig.customcommands.commands).filter((c: any) => !c.disabled);
		const disabledCommands = Object.values(guildConfig.customcommands.commands).filter((c: any) => c.disabled);

		const embed = {
			color: this.utils.getColor('blue'),
			title: `Custom Commands for ${(<eris.GuildChannel>message.channel).guild.name}`,
			fields: [],
			timestamp: (new Date()).toISOString(),
		};

		if (enabledCommands && enabledCommands.length) {
			embed.fields.push({ name: 'Enabled Commands', value: enabledCommands.map((c: any) => c.command).join('\n') });
		}
		if (disabledCommands && disabledCommands.length) {
			embed.fields.push({ name: 'Disabled Commands', value: disabledCommands.map((c: any) => c.command).join('\n') });
		}

		return this.sendMessage(message.channel, { embed });
	}

	public enable({ message, args, guildConfig }: core.CommandData) {
		if (!args || !args.length) {
			return this.help(message, guildConfig);
		}

		guildConfig.customcommands = guildConfig.customcommands || {};
		guildConfig.customcommands.commands = guildConfig.customcommands.commands || {};

		const name = args.join(' ');
		if (!guildConfig.customcommands.commands[name]) {
			return this.error(message.channel, `Command ${name} not found.`);
		}

		if (!guildConfig.customcommands.commands[name].disabled) {
			return this.error(message.channel, `Command ${name} is already enabled.`);
		}

		delete guildConfig.customcommands.commands[name].disabled;

		return this.dyno.guilds.update((<eris.GuildChannel>message.channel).guild.id,
			{ $set: { 'customcommands.commands': guildConfig.customcommands.commands } })
				.then(() => this.success(message.channel, `Command ${name} was enabled.`))
				.catch(() => this.error(message.channel, 'Something went wrong.'));
	}

	public disable({ message, args, guildConfig }: core.CommandData) {
		if (!args || !args.length) {
			return this.help(message, guildConfig);
		}

		guildConfig.customcommands = guildConfig.customcommands || {};
		guildConfig.customcommands.commands = guildConfig.customcommands.commands || {};

		const name = args.join(' ');
		if (!guildConfig.customcommands.commands[name]) {
			return this.error(message.channel, `Command ${name} not found.`);
		}

		if (guildConfig.customcommands.commands[name].disabled) {
			return this.error(message.channel, `Command ${name} is already disabled.`);
		}

		guildConfig.customcommands.commands[name].disabled = true;

		return this.dyno.guilds.update((<eris.GuildChannel>message.channel).guild.id,
			{ $set: { 'customcommands.commands': guildConfig.customcommands.commands } })
				.then(() => this.success(message.channel, `Command ${name} was disabled.`))
				.catch(() => this.error(message.channel, 'Something went wrong.'));
	}
}

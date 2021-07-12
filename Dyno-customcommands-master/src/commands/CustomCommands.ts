import { Command, CommandData, SubCommand } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class CustomCommands extends Command {
	public aliases       : string[] = ['customs', 'cc'];
	public group         : string   = 'Manager';
	public module        : string   = 'CustomCommands';
	public description   : string   = 'List, enable, disable custom commands.';
	public defaultUsage  : string   = 'customs';
	public defaultCommand: string   = 'list';
	public permissions   : string   = 'serverMod';
	public cooldown      : number   = 5000;
	public expectedArgs  : number   = 0;

	public commands: SubCommand[] = [
		{ name: 'list', desc: 'List custom commands', usage: 'customs list' },
		{ name: 'show', desc: 'Show a custom command', usage: 'customs show [command]' },
		{ name: 'enable', desc: 'Enable a custom command', usage: 'customs enable [command]' },
		{ name: 'disable', desc: 'Disable a custom command', usage: 'customs disable [command]' },
	];

	public usage: string[] = [
		'customs enable [command]',
		'customs disable [command]',
		'customs list',
		'customs show [command]',
	];

	public example: string[] = [
		'customs disable mycommand',
		'customs enable mycommand',
		'customs show mycommand',
	];

	public async execute() {
		return Promise.resolve();
	}

	public list({ message, args, guildConfig }: CommandData) {
		const commandConfig = guildConfig.customcommands;

		if (!commandConfig || !commandConfig.commands) {
			return this.sendMessage(message.channel, `There are no custom commands on this server.`);
		}

		if (Object.keys(commandConfig.commands).length === 0) {
			return this.sendMessage(message.channel, `There are no custom commands on this server.`);
		}

		const enabledCommands = Object.values(commandConfig.commands).filter((c: any) => !c.disabled);
		const disabledCommands = Object.values(commandConfig.commands).filter((c: any) => c.disabled);

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

	public enable({ message, args, guildConfig }: CommandData) {
		if (!args || !args.length) {
			return this.help(message, guildConfig);
		}

		const commandConfig = guildConfig.customcommands || {};
		commandConfig.commands = commandConfig.commands || {};

		const name = args.join(' ');
		if (!commandConfig.commands[name]) {
			return this.error(message.channel, `Command ${name} not found.`);
		}

		if (!commandConfig.commands[name].disabled) {
			return this.error(message.channel, `Command ${name} is already enabled.`);
		}

		delete commandConfig.commands[name].disabled;

		guildConfig.customcommands = commandConfig;

		return this.dyno.guilds.update((<eris.GuildChannel>message.channel).guild.id,
			{ $set: { 'customcommands.commands': commandConfig.commands } })
				.then(() => this.success(message.channel, `Command ${name} was enabled.`))
				.catch(() => this.error(message.channel, 'Something went wrong.'));
	}

	public disable({ message, args, guildConfig }: CommandData) {
		if (!args || !args.length) {
			return this.help(message, guildConfig);
		}

		const commandConfig = guildConfig.customcommands || {};
		commandConfig.commands = commandConfig.commands || {};

		const name = args.join(' ');
		if (!commandConfig.commands[name]) {
			return this.error(message.channel, `Command ${name} not found.`);
		}

		if (commandConfig.commands[name].disabled) {
			return this.error(message.channel, `Command ${name} is already disabled.`);
		}

		commandConfig.commands[name].disabled = true;

		guildConfig.customcommands = commandConfig;

		return this.dyno.guilds.update((<eris.GuildChannel>message.channel).guild.id,
			{ $set: { 'customcommands.commands': commandConfig.commands } })
				.then(() => this.success(message.channel, `Command ${name} was disabled.`))
				.catch(() => this.error(message.channel, 'Something went wrong.'));
	}

	// tslint:disable-next-line:cyclomatic-complexity
	public show({ message, args, guildConfig }: CommandData) {
		if (!args || !args.length) {
			return this.help(message, guildConfig);
		}

		const commandConfig = guildConfig.customcommands || {};
		const cmd = args[0].toLowerCase();
		const guild = (<eris.GuildChannel>message.channel).guild;

		if (!commandConfig.commands || !commandConfig.commands[cmd]) {
			return this.error(message.channel, `I can't find the command ${cmd}`);
		}

		const command = commandConfig.commands[cmd];

		const embed = {
			title: `${command.command}`,
			description: `${'```'}\n${command.response}\n${'```'}`,
			fields: [],
		};

		const options = [];

		if (command.delete) {
			options.push(`${this.config.emojis.success} Delete`);
		}

		if (command.silent) {
			options.push(`${this.config.emojis.success} Silent`);
		}

		if (command.dm) {
			options.push(`${this.config.emojis.success} Respond in DM`);
		}

		if (command.disableEveryone) {
			options.push(`${this.config.emojis.success} Disable Everyone`);
		}

		if (command.cooldown) {
			options.push(`${this.config.emojis.success} Cooldown ${command.cooldown / 1000}s`);
		}

		if (command.deleteAfter) {
			options.push(`${this.config.emojis.success} Delete After ${command.deleteAfter}s`);
		}

		if (command.args) {
			options.push(`${this.config.emojis.success} Required Arguments ${command.args}`);
		}

		if (options.length) {
			embed.fields.push({ name: 'Options', value: options.join('\n') });
		}

		if (command.allowedRoles && command.allowedRoles.length) {
			let allowedRoles: any[] = guild.roles.filter((r: eris.Role) => command.allowedRoles.find((role: any) => role.id === r.id));
			allowedRoles = allowedRoles.map((r: eris.Role) => `<@&${r.id}>`);
			if (allowedRoles) {
				embed.fields.push({ name: 'Allowed Roles', value: allowedRoles.join(' ') });
			}
		}

		if (command.ignoredRoles && command.ignoredRoles.length) {
			let ignoredRoles: any[] = guild.roles.filter((r: eris.Role) => command.ignoredRoles.find((role: any) => role.id === r.id));
			ignoredRoles = ignoredRoles.map((r: eris.Role) => `<@&${r.id}>`);
			if (ignoredRoles) {
				embed.fields.push({ name: 'Ignored Roles', value: ignoredRoles.join(' ') });
			}
		}

		if (command.allowedChannels && command.allowedChannels.length) {
			let allowedChannels: any[] = guild.channels.filter((c: eris.Channel) => command.allowedChannels.find((chan: any) => chan.id === c.id));
			allowedChannels = allowedChannels.map((c: eris.Channel) => `<#${c.id}>`);
			if (allowedChannels) {
				embed.fields.push({ name: 'Allowed Channels', value: allowedChannels.join(' ') });
			}
		}

		if (command.ignoredChannels && command.ignoredChannels.length) {
			let ignoredChannels: any[] = guild.channels.filter((c: eris.Channel) => command.ignoredChannels.find((chan: any) => chan.id === c.id));
			ignoredChannels = ignoredChannels.map((c: eris.Channel) => `<#${c.id}>`);
			if (ignoredChannels) {
				embed.fields.push({ name: 'Ignored Channels', value: ignoredChannels.join(' ') });
			}
		}

		return this.sendMessage(message.channel, { embed });
	}
}

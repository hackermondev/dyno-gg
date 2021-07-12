import {Command} from '@dyno.gg/dyno-core';
import * as core from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import ModUtils from '../ModUtils';

export default class Diagnose extends Command {
	public aliases: string[]         = ['diagnose'];
	public group: string           = 'Moderator';
	// public module: string          = 'Moderation';
	public description: string     = 'Diagnose any command or module in the bot to determine if there are any problems.';
	public usage: string           = 'diagnose [command or module]';
	public permissions: string     = 'serverMod';
	public overseerEnabled: boolean = true;
	public cooldown: number        = 5000;
	public expectedArgs: number    = 1;
	public noDisable: boolean      = true;

	public example: string[] = [
		'diagnose play',
		'diagnose music',
		'diagnose moderation',
		'diagnose ban',
		'diagnose custom commands',
	];

	public async execute(e: any) {
		const { message, args } = e;

		if (message.guild.id === this.config.dynoGuild && args.length > 1 && args[args.length - 1].match(/([0-9]+)/)) {
			if (this.isServerMod(message.member, message.guild.defaultChannel)) {
				const guildConfig = await this.dyno.guilds.getOrFetch(args.pop());
				if (!guildConfig) {
					return this.error(message.channel, `Error getting server config.`);
				}

				e.remote = true;
				e.guildConfig = guildConfig;
			}
		}

		const lowerargs = args[0].toLowerCase();

		if (lowerargs === 'chipped') {
			return this.sendMessage(message.channel, { embed: {
				color: this.utils.getColor('orange'),
				description: 'Chipped is ded.',
			} });
		} else if (lowerargs.startsWith('noob') || lowerargs.startsWith('lance')) {
			return this.sendMessage(message.channel, { embed: {
				color: this.utils.getColor('orange'),
				description: 'NoobLance is a god.',
			} });
		} else if (lowerargs.startsWith('carti')) {
			return this.sendMessage(message.channel, { embed: {
				color: this.utils.getColor('orange'),
				description: 'Carti is the best.',
			} });
		}

		const command = this.dyno.commands.find((c: core.Command) => c.name === args[0] && c.permissions !== 'admin');

		if (command) {
			return this.diagnoseCommand(command, e);
		}

		const module = this.dyno.modules.find((m: core.Module) => !m.core &&
			(m.module.toLowerCase() === args.join(' ').toLowerCase() ||
				(m.friendlyName && m.friendlyName.toLowerCase() === args.join(' ').toLowerCase())));

		if (module) {
			return this.diagnoseModule(module, e);
		}

		return this.error(message.channel, `I can't find a command or module by that name.`);
	}

	public diagnose({ message, guildConfig, perms }: any) {
		const permissions = ['readMessages', 'sendMessages', 'embedLinks', 'externalEmojis'];
		const diagnosis = { info: [], issues: [] };

		diagnosis.info.push(`The prefix for this server is \`${guildConfig.prefix || '?'}\``);

		if (guildConfig.modonly) {
			diagnosis.info.push(`Make commands mod-only is enabled.`);
		}

		const clientMember = message.channel.guild.members.get(this.client.user.id);

		if (!clientMember.roles || !clientMember.roles.length) {
			diagnosis.issues.push(`Dyno does not have a role, it should have atleast the Dyno role.`);
			diagnosis.issues.push(`You can fix this by authorizing the bot here: https://www.dynobot.net/invite`);
		}

		for (const perm of permissions) {
			if (!clientMember.permission.has(perm)) {
				const permission = this.config.permissionsMap[perm];
				diagnosis.issues.push(`The Dyno role is missing the ${permission} permission.`);
			}
		}

		if (perms && clientMember.roles && clientMember.roles.length) {
			const highestRole = this.utils.highestRole(message.channel.guild, clientMember);
			if (highestRole && highestRole.position === 1) {
				diagnosis.issues.push(`The Dyno role has not been moved, move it up in the list above other user roles.`);
			}
		}

		return diagnosis;
	}

	// tslint:disable-next-line:cyclomatic-complexity
	public diagnoseCommand(command: core.Command, { message, guildConfig }: any) {
		const globalConfig = this.dyno.globalConfig;
		const module = command.module || command.group;
		const diagnosis = this.diagnose({ message, guildConfig, perms: command.requiredPermissions }) ||
			{ info: [], issues: [] };

		const name = command.name;

		if (command.permissions === 'serverAdmin') {
			diagnosis.info.push(`The command requires Manage Server permissions.`);
		}

		if (command.permissions === 'serverMod') {
			diagnosis.info.push(`The command requires Moderator permissions.`);
		}

		if (globalConfig && globalConfig.commands && globalConfig.commands.hasOwnProperty(name) &&
			globalConfig.commands[name] === false) {
			diagnosis.issues.push(`The command is globally disabled in Dyno by the developer.`);
		}

		if (globalConfig && globalConfig.modules && globalConfig.modules.hasOwnProperty(module) &&
			globalConfig.modules[module] === false) {
			diagnosis.issues.push(`The ${module} module is globally disabled in Dyno by the developer.`);
		}

		if (guildConfig.commands[name] === false) {
			diagnosis.issues.push(`The command is disabled.`);
		}

		if (typeof guildConfig.commands[name] !== 'boolean' && guildConfig.commands[name].enabled === false) {
			diagnosis.issues.push(`The command is disabled.`);
		}

		if (this.dyno.modules.has(module) &&
			(guildConfig.modules.hasOwnProperty(module) && guildConfig.modules[module] === false)) {
			diagnosis.issues.push(`The ${module} module is disabled. Enable it to use this command.`);
		} else if (this.dyno.modules.has(module)) {
			diagnosis.info.push(`The command uses the ${module} module, which is enabled.`);
		}

		if (command.requiredPermissions) {
			const clientMember = message.channel.guild.members.get(this.client.user.id);
			for (const perm of command.requiredPermissions) {
				if (!clientMember.permission.has(perm)) {
					const permission = this.config.permissionsMap[perm];
					diagnosis.issues.push(`The Dyno role is missing the **${permission}** permission.`);
				}
			}
		}

		const embed: eris.EmbedOptions = {
			color: null,
			description: null,
			title: `Diagnosis: ${name}`,
			fields: [],
		};

		if (diagnosis.info.length) {
			embed.fields.push({ name: 'Info', value: diagnosis.info.join('\n'), inline: false });
		}

		if (diagnosis.issues.length) {
			embed.color = this.utils.getColor('orange');
			embed.fields.push({ name: 'Issues', value: diagnosis.issues.join('\n'), inline: false });
		} else {
			embed.color = this.utils.getColor('green');
			embed.description = 'There are no apparent issues with this command';
		}

		return this.sendMessage(message.channel, { embed });
	}

	public diagnoseModule(module: core.Module, { message, guildConfig, remote }: any) {
		const globalConfig = this.dyno.globalConfig;
		let diagnosis = this.diagnose({ message, guildConfig, perms: module.perms }) || { info: [], issues: [] };

		const name = module.module || module.name;

		if (globalConfig && globalConfig.modules && globalConfig.modules.hasOwnProperty(name) &&
			globalConfig.modules[name] === false) {
			diagnosis.issues.push(`The module is globally disabled in Dyno by the developer.`);
		}

		if (guildConfig.modules.hasOwnProperty(name) && guildConfig.modules[name] === false) {
			diagnosis.issues.push(`The module is disabled on this server.`);
		} else {
			diagnosis.info.push(`The module is enabled on this server.`);
		}

		if (module.permissions) {
			const clientMember = message.channel.guild.members.get(this.client.user.id);
			for (const perm of module.permissions) {
				if (!clientMember.permission.has(perm)) {
					const permission = this.config.permissionsMap[perm];
					diagnosis.issues.push(`The Dyno role is missing the **${permission}** permission.`);
				}
			}
		}

		if (module.diagnose) {
			diagnosis = module.diagnose({ guild: message.channel.guild, guildConfig, diagnosis, remote });
		}

		const embed = this.buildEmbed({
			color: null,
			description: null,
			title: `Diagnosis: ${name}`,
			fields: [],
			footer: {
				// tslint:disable-next-line:max-line-length
				text: `${this.config.stateName} | Cluster ${this.dyno.options.clusterId} | Shard ${message.channel.guild.shard.id} | ID ${message.channel.guild.id}`,
			},
		}, true);

		if (diagnosis) {
			if (diagnosis.info.length) {
				embed.fields.push({ name: 'Info', value: diagnosis.info.join('\n'), inline: false });
			}

			if (diagnosis.issues.length) {
				embed.color = this.utils.getColor('orange');
				embed.fields.push({ name: 'Issues', value: diagnosis.issues.join('\n'), inline: false });
			} else {
				embed.color = this.utils.getColor('green');
				embed.description = 'There are no apparent issues with this module';
			}
		}

		return this.sendMessage(message.channel, { embed });
	}
}

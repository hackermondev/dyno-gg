import { Command, CommandData, Module } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Modules extends Command {
	public aliases     : string[] = ['modules'];
	public group       : string   = 'Manager';
	public description : string   = 'List available modules';
	public usage	   : string   = 'modules';
	public example	   : string   = 'modules';
	public permissions : string   = 'serverAdmin';
	public cooldown    : number   = 5000;
	public overseerEnabled: boolean = true;
	public expectedArgs: number   = 0;

	public execute({ message, guildConfig }: CommandData) {
		const modules = this.dyno.modules.filter((m: any) => !m.admin && !m.adminEnabled && !m.core && m.list !== false);

		if (!modules) {
			return this.error(message.channel, `Couldn't get a list of modules.`);
		}

		const guild = (<eris.GuildChannel>message.channel).guild;

		const enabledModules = modules.filter((m: Module) => !guildConfig.modules.hasOwnProperty(m.name) ||
			guildConfig.modules[m.name] === true);
		const disabledModules = modules.filter((m: Module) => guildConfig.modules.hasOwnProperty(m.name) &&
			guildConfig.modules[m.name] === false);

		const embed = this.buildEmbed({
			author: {
				name: 'Dyno',
				url: 'https://www.dynobot.net',
				icon_url: `${this.config.avatar}?r=${this.config.version}`,
			},
			description: `To enable/disable a module, use \`${guildConfig.prefix || '?'}module ModuleName\` with the module names listed below`,
			fields: [],
		}, true);

		if (enabledModules.length) {
			embed.fields.push({ name: 'Enabled Modules', value: enabledModules.map((m: Module) => m.name).join('\n'), inline: false });
		}

		if (disabledModules.length) {
			embed.fields.push({ name: 'Disabled Modules', value: disabledModules.map((m: Module) => m.name).join('\n'), inline: false });
		}

		return this.sendMessage(message.channel, { embed });
	}
}

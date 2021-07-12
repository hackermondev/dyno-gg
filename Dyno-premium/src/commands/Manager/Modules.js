'use strict';

const Command = Loader.require('./core/structures/Command');

class Modules extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['modules'];
		this.group        = 'Manager';
		this.description  = 'List available modules';
		this.usage        = 'modules';
		this.permissions  = 'serverAdmin';
		this.overseerEnabled = true;
		this.disableDM    = true;
		this.expectedArgs = 0;
	}

	execute({ message, guildConfig }) {
		const modules = this.dyno.modules.filter(m => !m.admin && !m.core && m.list !== false);

		if (!modules) {
			return this.error(message.channel, `Couldn't get a list of modules.`);
		}

		const enabledModules = modules.filter(m => !guildConfig.modules.hasOwnProperty(m.name) ||
			guildConfig.modules[m.name] === true);
		const disabledModules = modules.filter(m => guildConfig.modules.hasOwnProperty(m.name) &&
			guildConfig.modules[m.name] === false);

		return this.sendMessage(message.channel, { embed: {
			author: {
				name: 'Dyno',
				url: 'https://www.dynobot.net',
				icon_url: `${this.config.site.host}/${this.config.avatar}?r=${this.config.version}`,
			},
			description: `To enable/disable a module, use \`${guildConfig.prefix || '?'}module ModuleName\` with the module names listed below`,
			fields: [
				{ name: 'Enabled Modules', value: enabledModules.map(m => m.name).join('\n'), inline: false },
				{ name: 'Disabled Modules', value: disabledModules.map(m => m.name).join('\n'), inline: false },
			],
		} });
	}
}

module.exports = Modules;

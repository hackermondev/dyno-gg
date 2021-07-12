'use strict';

const {Command} = require('@dyno.gg/dyno-core');

class ToggleModule extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['module'];
		this.file         = 'ToggleModule';
		this.group        = 'Manager';
		this.description  = 'Enable/disable a module';
		this.usage        = 'module [module name]';
		this.permissions  = 'serverAdmin';
		this.overseerEnabled = true;
		this.noDisable    = true;
		this.disableDM    = true;
		this.expectedArgs = 1;
	}

	execute({ message, args, guildConfig }) {
		const module = this.dyno.modules.find(c =>
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

		let key = `modules.${module.name}`;

		guildConfig.modules[module.name] = !guildConfig.modules[module.name];

		return this.dyno.guilds.update(guildConfig._id, { $set: { [key]: guildConfig.modules[module.name] } })
			.then(() => this.success(message.channel, guildConfig.modules[module.name] ?
				`Enabled ${module.name}` : `Disabled ${module.name}`))
			.catch(() => this.error(message.channel, 'Something went wrong.'));
	}
}

module.exports = ToggleModule;

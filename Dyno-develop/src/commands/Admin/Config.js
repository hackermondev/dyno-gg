const { Command } = require('@dyno.gg/dyno-core');
const uuid = require('uuid/v4');

class Config extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['cfg'];
		this.group        = 'Admin';
		this.description  = 'Get guild config';
		this.usage        = 'cfg [guild id]';
		this.cooldown     = 3000;
		this.hideFromHelp = true;
		this.permissions  = 'admin';
		this.overseerEnabled = true;
		this.expectedArgs = 0;
	}

	permissionsFn({ message }) {
		if (message.guild.id === this.config.dynoGuild) return true;

		const allowedRoles = [
			'225209883828420608',
			'355054563931324420',
			'231095149508296704',
			'203040224597508096',
		];

		if (message.member && allowedRoles.find(r => message.member.roles.includes(r))) {
			return true;
		}

		return false;
	}

	async execute({ message, args }) {
		const guildId = args[0] || message.guild.id;

		let payload = { guildId, userId: message.member.id };
		try {
			var uniqueId = uuid();
		} catch (err) {
			return this.error(message.channel, err);
		}

		if (!this.isServerMod(message.member, message.channel)) {
			payload.excludeKeys = ['customcommands', 'autoresponder'];
		}

		try {
			await this.redis.setex(`supportcfg:${uniqueId}`, 600, JSON.stringify(payload));
		} catch (err) {
			this.logger.error(err);
			return this.error(message.channel, 'Something went wrong. Try again later.');
		}

		const url = `https://${args[1] ? `${args[1]}.` : ''}dyno.gg/support/c/${uniqueId}`;

		return this.sendMessage(message.channel, `<${url}>`);
	}
}

module.exports = Config;

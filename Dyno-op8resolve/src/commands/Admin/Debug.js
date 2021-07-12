const { Command } = require('@dyno.gg/dyno-core');
const axios = require('axios');

class Debug extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['endebug'];
		this.group        = 'Admin';
		this.description  = 'Toggle Debug for a guild';
		this.usage        = 'debug [guild id]';
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

	async toggleDebug(guildId, value, host = 'premium.dyno.gg') {
		try {
			const options = {
				method: 'POST',
				headers: { Authorization: this.dyno.globalConfig.apiToken },
				url: `https://${host}/api/guild/${guildId}/debug`,
				data: {
					debug: value,
				},
			};

			await axios(options);
			return Promise.resolve();
		} catch (err) {
			return Promise.reject(err);
		}
	}

	async execute({ message, args }) {
		const guildId = args[0] || message.guild.id;

		try {
			await this.toggleDebug(guildId, true, 'premium.dyno.gg');
			await this.toggleDebug(guildId, true, 'staff.dyno.gg');
			return this.success(message.channel, 'Success!');
		} catch (err) {
			return this.error(message.channel, err);
		}
	}
}

module.exports = Debug;

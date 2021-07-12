'use strict';

const {Command} = require('@dyno.gg/dyno-core');

class Listmods extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['listmods'];
		this.group        = 'Manager';
		this.description  = 'List moderators';
		this.usage        = 'listmods';
		this.permissions  = 'serverAdmin';
		this.disableDM    = true;
		this.expectedArgs = 0;
	}

	execute({ message, guildConfig }) {
		const msgArray = [];

		if (!guildConfig) {
			return this.error(message.channel, 'No settings found for this server.');
		}

		const embed = {
			fields: [],
		};

		const admins = message.channel.guild.members.filter(m => this.isServerAdmin(m, message.channel));

		embed.fields.push({
			name: 'Admins',
			value: admins
				.filter(m => !m.bot)
				.map(m => m.mention)
				.join('\n'),
		});

		if (guildConfig.modRoles && guildConfig.modRoles.length) {
			embed.fields.push({
				name: 'Mod Roles',
				value: guildConfig.modRoles
					.filter(id => message.channel.guild.roles.has(id))
					.map(id => message.channel.guild.roles.get(id).mention)
					.join('\n'),
			});
		}

		if (guildConfig.mods && guildConfig.mods.length) {
			let mods = guildConfig.mods
				// .filter(id => message.channel.guild.members.has(id))
				.map(id => {
					const member = message.channel.guild.members.get(id);
					return member ? member.mention : `${id} (Left server)`;
				})
				.join('\n');

			if (mods && mods.length) {
				embed.fields.push({
					name: 'Moderators',
					value: mods,
				});
			}
		}

		return this.sendMessage(message.channel, { embed });
	}
}

module.exports = Listmods;

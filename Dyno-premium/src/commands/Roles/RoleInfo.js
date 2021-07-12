'use strict';

const Command = Loader.require('./core/structures/Command');

class RoleInfo extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['roleinfo'];
		this.group        = 'Roles';
		this.description  = 'Get information about a role.';
		this.usage        = 'roleinfo';
		this.expectedArgs = 1;
		this.cooldown     = 6000;
	}

	execute({ message, args }) {
		const guild = message.channel.guild;
		const role = this.resolveRole(message.channel.guild, args.join(' '));

		if (!role) {
			return this.error(message.channel, `I can't find that role`);
		}

		if (!guild.roles || !guild.roles.size) {
			return this.error(message.channel, 'There are no roles on this server.');
		}

		let members = guild.members.filter(m => m.roles.includes(role.id));

		const color = role.color ? role.color.toString(16) : null;

		const embed = {
			fields: [
				{ name: 'ID', value: role.id, inline: true },
				{ name: 'Name', value: role.name, inline: true },
				{ name: 'Color', value: color ? `#${color}` : 'None', inline: true },
				{ name: 'Mention', value: `\`<@&${role.id}>\``, inline: true },
				{ name: 'Members', value: members.length.toString(), inline: true },
				{ name: 'Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },
				{ name: 'Position', value: role.position.toString(), inline: true },
				{ name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
			],
			footer: {
				text: `Role Created`,
			},
			timestamp: new Date(role.createdAt),
		};

		if (color) {
			embed.color = role.color;
			embed.thumbnail = { url: `https://dummyimage.com/80x80/${color}/${color}.jpg` };
		}

		return this.sendMessage(message.channel, { embed });
	}
}

module.exports = RoleInfo;

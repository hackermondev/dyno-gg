'use strict';

const Command = Loader.require('./core/structures/Command');

class Members extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['members'];
		this.group        = 'Moderator';
		this.description  = 'List members in a role (max 90)';
		this.usage        = 'members [role]';
		this.permissions  = 'serverMod';
		this.overseerEnabled = true;
		this.disableDM    = true;
		this.expectedArgs = 1;
	}

	execute({ message, args, guildConfig }) {
		const role = this.resolveRole(message.guild, args.join(' '));

		if (!role) {
			return this.error(message.channel, `I couldn't find that role.`);
		}

		let members = message.guild.members.filter(m => m.roles.includes(role.id));

		if (!members || !members.length) {
			return this.sendMessage(message.channel, 'There are no members in that role.');
		}

		if (members.length > 90) {
			return this.error(message.channel, `There's too many members in that role to list.`);
		}

		let index = members.length > 1 ? Math.ceil(members.length / 2) : null,
			memberArray = members.map(m => `<@${m.id}>`);

		const embed = {
			title: `Members in ${role.name}`,
			fields: [],
		};

		if (index) {
			embed.fields.push({ name: '\u200B', value: memberArray.slice(0, index).join('\n'), inline: true });
			embed.fields.push({ name: '\u200B', value: memberArray.slice(index).join('\n'), inline: true });
		} else {
			embed.fields.push({ name: '\u200B', value: memberArray.join('\n'), inline: true });
		}

		return this.sendMessage(message.channel, { embed });
	}
}

module.exports = Members;

'use strict';

const Command = Loader.require('./core/structures/Command');
const utils = Loader.require('./core/utils');

class ServerInfo extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['serverinfo'];
		this.group        = 'Misc';
		this.description  = 'Get server info/stats.';
		this.usage        = 'serverinfo';
		this.cooldown     = 10000;
		this.expectedArgs = 0;
	}

	async execute({ message, args }) {
		const guild = (this.isAdmin(message.author) && args && args.length) ?
			this.client.guilds.get(args[0]) : message.channel.guild;

		const owner = this.client.users.get(guild.ownerID);

		const embed = {
			author: {
				name: guild.name,
				icon_url: guild.iconURL,
			},
			thumbnail: {
				url: `https://discordapp.com/api/guilds/${guild.id}/icons/${guild.icon}.jpg`,
			},
			fields: [
				{ name: 'ID', value: guild.id, inline: true },
				{ name: 'Name', value: guild.name, inline: true },
				{ name: 'Owner', value: utils.fullName(owner), inline: true },
				{ name: 'Region', value: guild.region, inline: true },
				{ name: 'Channels', value: guild.channels.size.toString(), inline: true },
				{ name: 'Members', value: guild.memberCount.toString(), inline: true },
				{ name: 'Humans', value: guild.members.filter(m => !m.bot).length.toString(), inline: true },
				{ name: 'Bots', value: guild.members.filter(m => m.bot).length.toString(), inline: true },
				{ name: 'Online', value: guild.members.filter(m => m.status !== 'offline').length.toString(), inline: true },
				{ name: 'Roles', value: guild.roles.size.toString(), inline: true },
				// { name: 'Emojis', value: guild.emojis.length.toString(), inline: true },
			],
			footer: {
				text: `Server Created`,
			},
			timestamp: new Date(guild.createdAt),
		};

		if (guild.roles.size < 25) {
			embed.fields.push({ name: 'Role List', value: guild.roles.map(r => r.name).join(', '), inline: false });
		}

		return this.sendMessage(message.channel, { embed });
	}
}

module.exports = ServerInfo;

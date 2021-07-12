'use strict';

const moment = require('moment');
const Command = Loader.require('./core/structures/Command');
const utils = Loader.require('./core/utils');

class Whois extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['whois', 'who', 'userinfo'];
		this.group        = 'Misc';
		this.description  = 'Get user information.';
		this.usage        = 'whois [user mention]';
		this.example      = 'whois @NoobLance';
		this.cooldown     = 3000;
		this.expectedArgs = 0;
	}

	execute({ message, args }) {
		let member = args.length ? this.resolveUser(message.channel.guild, args.join(' ')) : message.member;

		if (!member) return this.error(message.channel, `Couldn't find user ${args.join(' ')}`);

		const perms = {
			administrator: 'Administrator',
			manageGuild: 'Manage Server',
			manageRoles: 'Manage Roles',
			manageChannels: 'Manage Channels',
			manageMessages: 'Manage Messages',
			manageWebhooks: 'Manage Webhooks',
			manageNicknames: 'Manage Nicknames',
			manageEmojis: 'Manage Emojis',
			kickMembers: 'Kick Members',
			banMembers: 'Ban Members',
			mentionEveryone: 'Mention Everyone',
		};

		const roles = member.roles && member.roles.length ?
			utils.sortRoles(member.roles.map(r => {
				r = message.channel.guild.roles.get(r);
				return r.name;
			})).join(', ') : 'None';

		const joinPos = [...message.guild.members.values()]
			.sort((a, b) => (a.joinedAt < b.joinedAt) ? -1 : ((a.joinedAt > b.joinedAt) ? 1 : 0))
			.filter(m => !m.bot)
			.findIndex(m => m.id === member.id) + 1;

		const embed = {
			author: {
				name: utils.fullName(member),
				icon_url: member.user.avatarURL,
			},
			thumbnail: {
				url: member.user.avatarURL,
			},
			fields: [
				{ name: 'ID', value: member.id, inline: true },
				{ name: 'Nickname', value: member.nick || 'None', inline: true },
				{ name: 'Status', value: member.status, inline: true },
				{ name: 'Game', value: member.game ? member.game.name : 'None', inline: true },
				{ name: 'Joined', value: moment.unix(member.joinedAt / 1000).format('llll'), inline: true },
				{ name: 'Join Position', value: joinPos || 'None', inline: true },
				{ name: 'Registered', value: moment.unix(member.user.createdAt / 1000).format('llll'), inline: true },
				{ name: 'Roles', value: roles, inline: false },
			],
			timestamp: new Date(),
		};

		if (member.permission) {
			const memberPerms = member.permission.json;
			const infoPerms = [];
			for (let key in memberPerms) {
				if (!perms[key] || memberPerms[key] !== true) continue;
				if (memberPerms[key]) {
					infoPerms.push(perms[key]);
				}
			}

			if (infoPerms.length) {
				embed.fields.push({ name: 'Key Permissions', value: infoPerms.join(', '), inline: false });
			}
		}

		const extra = [];

		const contrib = this.config.contributors.find(c => c.id === member.id && c.title);

		if (member.id === this.client.user.id) extra.push('The one and only...');
		if (this.isAdmin(member)) extra.push(`Dyno Creator`);

		if (contrib) extra.push(contrib.title);

		if (this.isServerAdmin(member, message.channel)) extra.push(`Server Admin`);
		else if (this.isServerMod(member, message.channel)) extra.push(`Server Moderator`);

		if (extra.length) {
			embed.fields.push({ name: 'Acknowledgements', value: extra.join(', '), inline: false });
		}

		return this.sendMessage(message.channel, { embed }).catch(err => this.logger.error(err));
	}
}

module.exports = Whois;

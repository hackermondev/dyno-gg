'use strict';

const Command = Loader.require('./core/structures/Command');

class Unban extends Command {
	constructor(...args) {
		super(...args);

		this.aliases = ['unban'];
		this.group = 'Moderator';
		this.description = 'Unban a member';
		this.usage = 'unban [user], [optional reason]';
		this.example = 'unban @NoobLance, Appealed';
		this.permissions = 'serverMod';
		this.disableDM = true;
		this.expectedArgs = 1;
		this.requiredPermissions = ['banMembers'];
	}

	async execute({ message, args, guildConfig }) {
		const Moderation = this.dyno.modules.get('Moderation');

		const bans = await this.client.getGuildBans(message.channel.guild.id).catch(() => false).then(d => d.map(ban => ban.user || ban));
		if (!bans) {
			return this.error(message.channel, `I can't get server bans, make sure I have Manage Server/Ban Members permissions.`);
		}

		let user;

		try {
			user = this.resolveUser(message.channel.guild, args.join(' '), bans);
		} catch (err) {
			this.logger.error(err);
		}

		if (!user) {
			return this.error(message.channel, `I can't find that user.`);
		}

		if (user === this.client.user.id || user === message.author.id) {
			return this.error(message.channel, `That user isn't banned.`);
		}

		let reason = args.length > 1 ? args.join(' ').replace(user.username, '').replace(`#${user.discriminator}`, '') : null;
		reason = reason.length ? reason : null;

		try {
			await message.channel.guild.unbanMember(user.id);
			Moderation.logEvent({
				type: 'Unban',
				user: user,
				guild: message.channel.guild,
				mod: message.author,
				reason, guildConfig,
			});
			return this.success(message.channel, `***${this.utils.fullName(user)} was unbanned!***`);
		} catch (err) {
			return this.error(message.channel, `I can't unban ${user.username}#${user.discriminator}`, err);
		}
	}
}

module.exports = Unban;

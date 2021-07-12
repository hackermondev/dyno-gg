'use strict';

const Command = Loader.require('./core/structures/Command');

class Softban extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['softban'];
		this.group        = 'Moderator';
		this.description  = 'Softban a member (ban and immediate unban to delete user messages)';
		this.usage        = `softban [user] [reason]`;
		this.example      = `softban @NoobLance Get out!`;
		this.permissions  = 'serverMod';
		this.disableDM    = true;
		this.cooldown     = 3000;
		this.expectedArgs = 1;
		this.requiredPermissions = ['banMembers'];
	}

	execute({ message, args, guildConfig }) {
		const Moderation = this.dyno.modules.get('Moderation');
		const user       = this.resolveUser(message.channel.guild, args[0]);
		const reason     = args.length > 1 ? args.slice(1).join(' ') : null;

		if (!user) {
			return this.error(message.channel, `I can't find user ${args[0]}.`);
		}

		if (this.isServerMod(user, message.channel)) {
			return this.error(message.channel, `That user is a mod/admin, I can't do that.`);
		}

		if (!Moderation.isProtected(message, user, guildConfig)) {
			return this.error(message.channel, `That user is protected, I can't do that`);
		}

		if (user.id === this.client.user.id) {
			return this.error(message.channel, `I can't ban ${user.username}`);
		}

		return Moderation.commands.softban(message, user, reason)
			.then(res => this.success(message.channel, res))
			.catch(err => this.error(message.channel, err));
	}
}

module.exports = Softban;

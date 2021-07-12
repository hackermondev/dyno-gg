'use strict';

const Command = Loader.require('./core/structures/Command');

class Kick extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['kick'];
		this.group        = 'Moderator';
		this.description  = 'Kick a member';
		this.usage        = 'kick [user] [reason]';
		this.example      = 'kick @NoobLance Get out!';
		this.permissions  = 'serverMod';
		this.requiredPermissions = ['kickMembers'];
		this.cooldown     = 3000;
		this.disableDM    = true;
		this.expectedArgs = 1;
	}

	execute({ message, args, guildConfig }) {
		const Moderation = this.dyno.modules.get('Moderation');
		const user       = this.resolveUser(message.channel.guild, args[0], null, true);
		const reason     = args.length > 1 ? args.slice(1).join(' ') : null;

		if (!user) {
			return this.error(message.channel, `I can't find user ${args[0]}.`);
		}

		if (!user.bot && this.isServerMod(user, message.channel)) {
			return this.error(message.channel, `That user is a mod/admin, I can't do that.`);
		}

		if (!Moderation.isProtected(message, user, guildConfig)) {
			return this.error(message.channel, `That user is protected, I can't do that`);
		}

		if (user.id === this.client.user.id) {
			return this.error(message.channel, `I can't kick ${user.username}#${user.discriminator}`);
		}

		return Moderation.commands.kick(message, user, reason)
			.then(res => this.success(message.channel, res))
			.catch(err => this.error(message.channel, err));
	}
}

module.exports = Kick;

'use strict';

const Command = Loader.require('./core/structures/Command');

class Ban extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['ban'];
		this.group        = 'Moderator';
		this.description  = 'Ban a member, optional time limit';
		this.usage        = `ban [user] [limit] [reason]`;
		this.example      = `ban @NoobLance Get out!`;
		this.permissions  = 'serverMod';
		this.requiredPermissions = ['banMembers'];
		this.disableDM    = true;
		this.cooldown     = 3000;
		this.expectedArgs = 1;
	}

	async execute({ message, args, guildConfig }) {
		try {
			var user = this.resolveUser(message.channel.guild, args[0], null, true);
		} catch (err) {
			this.logger.error(err);
		}

		const Moderation = this.dyno.modules.get('Moderation');

		let reason = null,
			limit  = null;

		if (args[1] && args[1].match(/([0-9]+)([a-zA-Z]+)?/g)) {
			limit = this.utils.parseTimeLimit(args[1]);
		}

		reason = limit && args.length > 2 ? args.slice(2).join(' ') : args.length > 1 ? args.slice(1).join(' ') : null;
		reason = reason || null;

		if (!user && args[0].match(/^([0-9]+)$/)) {
			if (args[0] === this.client.user.id || args[0] === message.author.id) {
				return this.error(message.channel, `I can't ban ${user.username}#${user.discriminator}`);
			}

			return Moderation.commands.ban(message, args[0], reason, limit);
		}

		if (user.id === this.client.user.id) {
			return this.error(message.channel, `I can't ban that user.`);
		}

		if (!user) {
			return this.error(message.channel, `I can't find user ${args[0]}.`);
		}

		if (this.isServerMod(user, message.channel)) {
			return this.error(message.channel, `That user is a mod/admin, I can't do that.`);
		}

		if (!Moderation.isProtected(message, user, guildConfig)) {
			return this.error(message.channel, `That user is protected, I can't do that`);
		}

		return Moderation.commands.ban(message, user, reason, limit)
			.then(res => this.success(message.channel, res))
			.catch(err => this.error(message.channel, err));
	}
}

module.exports = Ban;

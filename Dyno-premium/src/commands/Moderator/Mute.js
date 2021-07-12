'use strict';

const Command = Loader.require('./core/structures/Command');

class Mute extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['mute'];
		this.group        = 'Moderator';
		this.description  = 'Mute a member so they cannot type or speak, time limit in minutes.';
		this.usage        = 'mute [user] [limit] [reason]';
		this.permissions  = 'serverMod';
		this.disableDM    = true;
		this.cooldown     = 3000;
		this.expectedArgs = 2;
		this.requiredPermissions = ['manageRoles', 'manageChannels', 'voiceMuteMembers'];
		
		this.example = [
			'mute @NoobLance 10 Shitposting',
			'mute User 10m spamming',
			'mute NoobLance 1d Too Cool',
			'mute NoobLance 5h He asked for it',
		];
	}

	execute({ message, args, guildConfig }) {
		const user = this.resolveUser(message.channel.guild, args[0], null, true),
			Moderation = this.dyno.modules.get('Moderation'),
			limit = this.utils.parseTimeLimit(args[1]);

		if (limit && limit > 10080) {
			return this.error(message.channel, `Please use a valid limit in minutes and less than 7 days`);
		}

		// let reason = args.length > 2 ? args.slice(2).join(' ') : null;
		let reason = limit && args.length > 2 ?
			args.slice(2).join(' ') :
			(args.length > 1 ? args.slice(1).join(' ') : null);

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
			return this.error(message.channel, `I can't mute ${user.username}#${user.discriminator}`);
		}

		if (isNaN(parseInt(limit))) {
			return this.error(message.channel, 'Time limit should be a number (in minutes).');
		}

		// set the reason if it doesn't exist
		reason = reason || 'No reason given.';

		return Moderation.commands.mute(message, user, limit, reason)
			.then(res => this.success(message.channel, res))
			.catch(err => this.error(message.channel, err));
	}
}

module.exports = Mute;

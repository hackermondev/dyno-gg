'use strict';

const Command = Loader.require('./core/structures/Command');

class Warn extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['warn'];
		this.group        = 'Moderator';
		this.description  = 'Warn a member';
		this.usage        = 'warn [user] [reason]';
		this.example      = 'warn @NoobLance Stop posting lewd images';
		this.permissions  = 'serverMod';
		this.cooldown     = 3000;
		this.expectedArgs = 2;
	}

	execute({ message, args }) {
		const Moderation = this.dyno.modules.get('Moderation');
		const user = this.resolveUser(message.channel.guild, args[0], null, true);

		if (!user) {
			return this.error(message.channel, `I can't find user ${args[0]}.`);
		}

		if (user === this.client.user.id || user === message.author.id) {
			return this.error(message.channel, `I can't warn ${this.utils.fullName(user)}`);
		}

		let reason = args.length > 1 ? args.slice(1).join(' ') : null;

		if (!reason) {
			return this.error(message.channel, `Please give a reason.`);
		}

		return Moderation.commands.warn(message, user, reason)
			.then(res => this.success(message.channel, res))
			.catch(err => this.error(message.channel, err));
	}
}

module.exports = Warn;

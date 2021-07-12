'use strict';

const Command = Loader.require('./core/structures/Command');

class Unmute extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['unmute'];
		this.group        = 'Moderator';
		this.description  = 'Unmute a member';
		this.usage        = 'unmute [user] (optional reason)';
		this.example      = 'unmute @NoobLance Appealed';
		this.permissions  = 'serverMod';
		this.expectedArgs = 1;
		this.requiredPermissions = ['manageRoles'];
	}

	execute({ message, args }) {
		const Moderation = this.dyno.modules.get('Moderation');
		const user       = this.resolveUser(message.channel.guild, args[0]);

		if (!user) {
			return this.error(message.channel, `I can't find user ${args[0]}.`);
		}

		if (user === this.client.user.id || user === message.author.id) {
			return this.error(message.channel, `I can't unmute ${this.utils.fullName(user)}`);
		}

		let reason = args.length > 1 ? args.slice(1).join(' ') : null;

		return Moderation.commands.unmute(message, user, reason)
			.then(res => this.success(message.channel, res))
			.catch(err => this.error(message.channel, err));
	}
}

module.exports = Unmute;

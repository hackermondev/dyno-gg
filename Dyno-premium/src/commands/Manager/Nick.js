'use strict';

const Command = Loader.require('./core/structures/Command');

class Nick extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['nick'];
		this.group        = 'Manager';
		this.description  = 'Change the bot nickname.';
		this.usage        = 'nickname [new nickname]';
		this.permissions  = 'serverAdmin';
		this.expectedArgs = 1;
		this.disableDM    = true;
		this.requiredPermissions = ['changeNickname'];
	}

	async execute({ message, args }) {
		const nick = (args.length) ? args.join(' ') : null;
			// member = message.channel.guild.members.get(this.client.user.id);

		try {
			await this.client.editNickname(message.channel.guild.id, nick);
		} catch (err) {
			return this.error(message.channel, 'Unable to change nickname.', err);
		}

		return this.success(message.channel, 'Nickname changed.');
	}
}

module.exports = Nick;

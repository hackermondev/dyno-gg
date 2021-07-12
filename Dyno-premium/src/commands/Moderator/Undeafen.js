'use strict';

const Command = Loader.require('./core/structures/Command');

class Undeafen extends Command {
	constructor(...args) {
		super(...args);

		this.aliases = ['undeafen'];
		this.group = 'Moderator';
		this.description = 'Undeafen a member';
		this.usage = 'undeafen [user]';
		this.example = 'undeafen @NoobLance';
		this.permissions = 'serverMod';
		this.disableDM = true;
		this.expectedArgs = 1;
		this.requiredPermissions = ['deafenMembers'];
	}

	execute({ message, args, guildConfig }) {
		let member = this.resolveUser(message.channel.guild, args[0]),
			Moderation = this.dyno.modules.get('Moderation');

		if (!member) return this.error(message.channel, `Couldn't find user ${args[0]}.`);

		if (member === this.client.user || member === message.author) {
			return this.error(message.channel, `I can't undeafen ${this.utils.fullName(member)}`);
		}

		return member.edit({ deaf: false })
			.then(() => {
				Moderation.logEvent({
					type: 'Deafen',
					user: member,
					guild: message.channel.guild,
					mod: message.author,
					guildConfig,
				});
				return this.success(message.channel, `${this.utils.fullName(member)} was undeafened.`);
			})
			.catch(err => this.error(message.channel, `I can't undeafen ${this.utils.fullName(member)}`, err));
	}
}

module.exports = Undeafen;

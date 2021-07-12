'use strict';

const Command = Loader.require('./core/structures/Command');

class Deafen extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['deafen'];
		this.group        = 'Moderator';
		this.description  = 'Deafen a member';
		this.usage        = 'deafen [user]';
		this.example      = 'deafen @NoobLance';
		this.permissions  = 'serverMod';
		this.disableDM    = true;
		this.expectedArgs = 1;
		this.requiredPermissions = ['voiceDeafenMembers'];
	}

	async execute({ message, args, guildConfig }) {
		const member = this.resolveUser(message.channel.guild, args[0]);
		const Moderation = this.dyno.modules.get('Moderation');

		if (!member) {
			return this.error(message.channel, `Couldn't find user ${args[0]}.`);
		}

		if (member === this.client.user || member === message.author) {
			return this.error(message.channel, `I can't deafen ${this.utils.fullName(member)}`);
		}

		return member.edit({ deaf: true })
			.then(() => {
				Moderation.logEvent({
					type: 'Deafen',
					user: member,
					guild: message.channel.guild,
					mod: message.author,
					guildConfig,
				});
				return this.success(message.channel, `${this.utils.fullName(member)} was deafened.`);
			})
			.catch(err => this.error(message.channel, `I can't deafen ${this.utils.fullName(member)}`, err));
	}
}

module.exports = Deafen;

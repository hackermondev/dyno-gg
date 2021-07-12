'use strict';

const Command = Loader.require('./core/structures/Command');

class ServerInvite extends Command {
	constructor(...args) {
		super(...args);

		this.aliases = ['serverinvite'];
		this.group = 'Misc';
		this.description = 'Create an invite to this server.';
		this.usage = 'serverinvite';
		this.expectedArgs = 0;
		this.cooldown = 60000;
	}

	execute({ message, args, isAdmin, isOverseer }) {
		if (args && args.length && (isAdmin || isOverseer)) {
			return this.client.createChannelInvite(args[0])
				.then(invite => this.sendMessage(message.channel, `https://discord.gg/${invite.code}`))
				.catch(err => this.error(message.channel, err && err.message ? err.message : `I can't create an invite.`));
		}

		return message.channel.guild.defaultChannel.createInvite()
			.then(invite => this.success(message.channel, `https://discord.gg/${invite.code}`))
			.catch(() => this.error(message.channel, `I can't create an invite here.`));
	}
}

module.exports = ServerInvite;

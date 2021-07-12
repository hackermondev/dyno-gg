'use strict';

const Command = Loader.require('./core/structures/Command');

class Clean extends Command {
	constructor(...args) {
		super(...args);

		this.aliases = ['clean'];
		this.group = 'Moderator';
		this.description = 'Cleanup the bot responses.';
		this.usage = 'clean (optional number)';
		this.permissions = 'serverMod';
		this.expectedArgs = 0;
		this.cooldown = 3000;
	}

	async execute({ message, args }) {
		let messages = [],
			count = args.length ? args[0] : 100;

		try {
			const result = await this.client.getMessages(message.channel.id, 100, message.id);
			messages = result.filter(m => m.author.id === this.client.user.id);
			if (!messages.length) return Promise.resolve();

			messages = messages.map(m => m.id);
			if (count && !isNaN(count)) {
				messages = messages.slice(0, parseInt(count));
			}

			await this.client.deleteMessages(message.channel.id, messages);
			message.delete().catch(() => false);
			return Promise.resolve();
		} catch (err) {
			if (messages.length) {
				for (const msg of messages) {
					msg.delete().catch(() => false);
				}
				message.delete().catch(() => false);
			}
			return Promise.resolve();
		}
	}
}

module.exports = Clean;

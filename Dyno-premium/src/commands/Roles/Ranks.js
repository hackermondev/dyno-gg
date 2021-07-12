'use strict';

const Command = Loader.require('./core/structures/Command');

class Ranks extends Command {
	constructor(...args) {
		super(...args);

		this.aliases = ['ranks'];
		this.group = 'Roles';
		this.module = 'Autoroles';
		this.description = 'Get a list of joinable ranks.';
		this.usage = 'ranks';
		this.expectedArgs = 0;
		this.cooldown = 10000;
	}

	async execute({ message }) {
		const Autoroles = this.dyno.modules.get('Autoroles');

		try {
			const ranks = await Autoroles.ranks.getRanks(message.channel.guild);
			return this.sendMessage(message.channel, ranks);
		} catch (err) {
			return this.error(message.channel, 'Something went wrong.', err);
		}
	}
}

module.exports = Ranks;

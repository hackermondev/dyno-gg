'use strict';

const Command = Loader.require('./core/structures/Command');

class Flipcoin extends Command {
	constructor(...args) {
		super(...args);

		this.aliases = ['flipcoin'];
		this.group = 'Misc';
		this.description = 'Flip a coin.';
		this.usage = 'flipcoin';
		this.cooldown = 3000;
		this.expectedArgs = 0;
	}

	execute({ message }) {
		let result = (Math.floor(Math.random() * 2) === 0) ? 'heads' : 'tails';
		return this.sendMessage(message.channel, `${message.author.mention} ${result}`);
	}
}

module.exports = Flipcoin;

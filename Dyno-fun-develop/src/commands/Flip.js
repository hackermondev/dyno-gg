const { Command } = require('@dyno.gg/dyno-core');

class Flip extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['flip', 'flipcoin'];
		this.module       = 'Fun';
		this.description  = 'Flip a coin.';
		this.usage        = 'flip';
		this.example      = 'flip';
		this.cooldown     = 3000;
		this.expectedArgs = 0;
	}

	execute({ message }) {
		const result = (Math.floor(Math.random() * 2) === 0) ? 'heads' : 'tails';
		return this.sendMessage(message.channel, `${message.author.mention} ${result}`);
	}
}

module.exports = Flip;

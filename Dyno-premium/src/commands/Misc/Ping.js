'use strict';

const Command = Loader.require('./core/structures/Command');

class Ping extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['ping'];
		this.group        = 'Misc';
		this.description  = 'Ping the bot';
		this.usage        = 'ping';
		this.hideFromHelp = true;
		this.cooldown     = 3000;
		this.expectedArgs = 0;
	}

	execute({ message }) {
		let start = message.timestamp;

		return this.sendMessage(message.channel, 'Pong! ')
			.then(msg => {
				let diff = (msg.timestamp - start);
				return msg.edit(`Pong! \`${diff}ms\``);
			});
	}
}

module.exports = Ping;

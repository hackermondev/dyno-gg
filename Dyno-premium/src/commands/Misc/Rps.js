'use strict';

const Command = Loader.require('./core/structures/Command');
const utils = Loader.require('./core/utils');

class Rps extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['rps'];
		this.group        = 'Misc';
		this.description  = 'Rock Paper Scissors with the bot.';
		this.usage        = 'rps [choice]';
		this.cooldown     = 3000;
		this.expectedArgs = 1;
	}

	execute({ message, args }) {
		let rps = ['rock', 'paper', 'scissors'],
			choice = rps[Math.floor(Math.random() * rps.length)],
			userChoice = args[0].toLowerCase(),
			msgArray = [];

		msgArray.push(`You chose ***${utils.ucfirst(userChoice)}***. I choose ***${utils.ucfirst(choice)}***.`);

		if (choice === userChoice) {
			msgArray.push(`It's a tie! Please choose another.`);
			return this.sendMessage(message.channel, msgArray);
		}

		switch (choice) {
			case 'rock':
				if (userChoice === 'paper') msgArray.push('Paper wins!');
				else if (userChoice === 'scissors') msgArray.push('Rock wins!');
				else if (userChoice === 'noob') msgArray.push('Noob wins!');
				else msgArray.push('Rock wins!');
				break;
			case 'paper':
				if (userChoice === 'rock') msgArray.push('Paper wins!');
				else if (userChoice === 'scissors') msgArray.push('Scissors win!');
				else if (userChoice === 'noob') msgArray.push('Noob wins!');
				else msgArray.push('Paper wins!');
				break;
			case 'scissors':
				if (userChoice === 'rock') msgArray.push('Rock wins!');
				else if (userChoice === 'paper') msgArray.push('Scissors win!');
				else if (userChoice === 'noob') msgArray.push('Noob wins!');
				else msgArray.push('Scissors win!');
				break;
		}

		return this.sendMessage(message.channel, msgArray);
	}
}

module.exports = Rps;

const { Command } = require('@dyno.gg/dyno-core');

class Rps extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['rps'];
		this.module       = 'Fun';
		this.description  = 'Rock Paper Scissors with the bot.';
		this.usage        = 'rps [choice]';
		this.example      = 'rps rock';
		this.cooldown     = 3000;
		this.expectedArgs = 1;
	}

	execute({ message, args }) {
		const rps = ['rock', 'paper', 'scissors'];
		const choice = rps[Math.floor(Math.random() * rps.length)];
		const userChoice = args[0].toLowerCase();
		const msgArray = [];

		msgArray.push(`You chose ***${this.utils.ucfirst(userChoice)}***. I choose ***${this.utils.ucfirst(choice)}***.`);

		if (choice === userChoice) {
			msgArray.push(`It's a tie! Please choose another.`);
			return this.sendMessage(message.channel, msgArray.join('\n'));
		}

		if (userChoice === 'noob') {
			msgArray.push('Noob wins!');
			return this.sendMessage(message.channel, msgArray.join('\n'));
		}

		switch (choice) {
			case 'rock':
				switch (userChoice) {
					case 'paper':
						msgArray.push('Paper wins!');
						break;
					case 'scissors':
						msgArray.push('Rock wins!');
						break;
					default:
						msgArray.push('Rock wins!');
				}
				break;
			case 'paper':
				switch (userChoice) {
					case 'rock':
						msgArray.push('Paper wins!');
						break;
					case 'scissors':
						msgArray.push('Scissors win!');
						break;
					default:
						msgArray.push('Paper wins!');
				}
				break;
			case 'scissors':
				switch (userChoice) {
					case 'rock':
						msgArray.push('Rock wins!');
						break;
					case 'paper':
						msgArray.push('Scissors win!');
						break;
					default:
						msgArray.push('Scissors win!');
				}
				break;
			default:
				return Promise.resolve();
		}

		return this.sendMessage(message.channel, msgArray.join('\n'));
	}
}

module.exports = Rps;

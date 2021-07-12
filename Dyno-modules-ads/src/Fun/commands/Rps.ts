import { Command, CommandData } from '@dyno.gg/dyno-core';

export default class Rps extends Command {
	public aliases     : string[] = ['rps'];
	public module      : string   = 'Fun';
	public description : string   = 'Rock Paper Scissors with the bot.';
	public usage	   : string   = 'rps [choice]';
	public example	   : string   = 'rps rock';
	public cooldown    : number   = 5000;
	public expectedArgs: number   = 1;

	public execute({ message, args }: CommandData) {
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

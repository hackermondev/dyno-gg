const { Command } = require('@dyno.gg/dyno-core');
const superagent = require('superagent');

class DadJoke extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['dadjoke', 'badjoke'];
		this.module       = 'Fun';
		this.description  = 'Get a random Dad joke.';
		this.usage        = 'dadjoke';
		this.example      = 'dadjoke';
		this.cooldown     = 5000;
		this.expectedArgs = 0;
	}

	async execute({ message }) {
		try {
			let res = await superagent
				.get('https://icanhazdadjoke.com/')
				.set({ Accept: 'application/json' });

			return this.sendMessage(message.channel, JSON.parse(res.text).joke);
		} catch (err) {
			return this.error(message.channel, 'Error 404: Humor module not found!');
		}
	}
}

module.exports = DadJoke;

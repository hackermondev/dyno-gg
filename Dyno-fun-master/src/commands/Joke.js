const { Command } = require('@dyno.gg/dyno-core');
const superagent = require('superagent');

class Joke extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['joke'];
		this.module       = 'Fun';
		this.description  = 'Get a joke.';
		this.usage        = 'joke';
		this.example      = 'joke';
		this.cooldown     = 5000;
		this.expectedArgs = 0;
	}

	async execute({ message }) {
		try {
			let res = await superagent
				.get('https://08ad1pao69.execute-api.us-east-1.amazonaws.com/dev/random_joke')
				.set({ Accept: 'application/json' });

			let mess = '- ' + res.body.setup.split('\n').join('\n-') + '\n- ' + res.body.punchline;
			return this.sendMessage(message.channel, mess);
		} catch (err) {
			return this.error(message.channel, 'Error 404: Humor module not found!');
		}
	}
}

module.exports = Joke;

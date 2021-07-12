const { Command } = require('@dyno.gg/dyno-core');
const superagent = require('superagent');

class ChuckNorris extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['dynonorris', 'dynorris'];
		this.module       = 'Fun';
		this.description  = 'Get a random Dyno Norris fact.';
		this.usage        = 'dynorris';
		this.example      = 'dynorris';
		this.cooldown     = 5000;
		this.expectedArgs = 0;
	}

	async execute({ message }) {
		try {
			let res = await superagent.get('https://api.icndb.com/jokes/random?firstName=Dyno');

			return this.sendMessage(message.channel, res.body.value.joke);
		} catch (err) {
			return this.error(message.channel, 'No facts founds.. Something went wrong.');
		}
	}
}

module.exports = ChuckNorris;

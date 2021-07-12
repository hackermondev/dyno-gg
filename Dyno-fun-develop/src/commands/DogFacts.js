const { Command } = require('@dyno.gg/dyno-core');
const Prefetcher = require('../Prefetcher');

class DogFacts extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['dogfact', 'doggofact']; // woof facts
		this.module       = 'Fun';
		this.description  = 'Get random Dog Facts with this commmand';
		this.usage        = 'dogfact';
		this.example      = 'dogfact';
		this.cooldown     = 5000;
		this.expectedArgs = 0;
		this._factCache    = new Prefetcher('https://fact.birb.pw/api/v1/dog');

		this._factCache.init();
	}

	async execute({ message }) {
		try {
			let res = await this._factCache.get();

			return this.sendMessage(message.channel, res.body.string);
		} catch (err) {
			return this.error(message.channel, 'No doggo facts founds.. Something went wrong.');
		}
	}
}

module.exports = DogFacts;

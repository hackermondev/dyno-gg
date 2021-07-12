const { Command } = require('@dyno.gg/dyno-core');
const Prefetcher = require('../Prefetcher');

class Quote extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['quote'];
		this.module       = 'Fun';
		this.description  = 'Get a random quote.';
		this.usage        = 'quote';
		this.example      = 'quote';
		this.cooldown     = 5000;
		this.expectedArgs = 0;
		this._quoteCache   = new Prefetcher('https://talaikis.com/api/quotes/random/');

		this._quoteCache.init();
	}

	async execute({ message }) {
		try {
			let res = await this._quoteCache.get();
			return this.sendMessage(message.channel, `${res.body.quote} - **${res.body.author}**`);
		} catch (err) {
			return this.error(message.channel, 'An error occured: Unable to fetch quote.');
		}
	}
}

module.exports = Quote;

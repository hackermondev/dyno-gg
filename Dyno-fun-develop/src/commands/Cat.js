const { Command } = require('@dyno.gg/dyno-core');
const Prefetcher = require('../Prefetcher');


class Cat extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['cat', 'kitty'];
		this.module       = 'Fun';
		this.description  = 'Find some cute cat pictures';
		this.usage        = 'cat';
		this.example      = 'cat';
		this.cooldown     = 7500;
		this.expectedArgs = 0;
		this._catCache     = new Prefetcher('https://api.thecatapi.com/v1/images/search?format=src&size=full');

		this._catCache.init();
	}

	async execute({ message }) {
		const errorText = `Error: ${this.config.emojis.sadcat || '😿'} No cats found.`;

		try {
			const utils = this.utils;
			const responses = [
				{ search: 'Looking for a kitty...', found: 'Found one!' },
			];

			const response = responses[utils.getRandomInt(0, responses.length - 1)];
			const msg = await this.sendMessage(message.channel, response.search);

			let res = await this._catCache.get();

			if (!res || !res.redirects || !res.redirects.length) {
				return this.error(message.channel, errorText);
			}

			return msg.edit({
				content: response.found,
				embed: {
					title: '🐱 Meowww..',
					color: 0x3498db,
					image: {
						url: res.redirects[0],
					},
					url: res.redirects[0],
				},
			});
		} catch (err) {
			return this.error(message.channel, errorText);
		}
	}
}

module.exports = Cat;

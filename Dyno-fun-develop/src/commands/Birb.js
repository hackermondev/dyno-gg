const { Command } = require('@dyno.gg/dyno-core');
const Prefetcher = require('../Prefetcher');


class Birb extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['bird', 'birb', 'lunar'];
		this.module       = 'Fun';
		this.description  = 'Random Adorable Birdies';
		this.usage        = 'bird';
		this.example      = 'bird';
		this.cooldown     = 7500;
		this.expectedArgs = 0;
		this._birbCache    = new Prefetcher('https://random.birb.pw/tweet/');

		this._birbCache.init();
	}

	async execute({ message }) {
		const errorText = `Error: ${this.config.emojis.sadcat || '🐦'} No birds found.`;

		try {
			const utils = this.utils;
			const responses = [
				{ search: 'Looking for some birdies...', found: 'Found one!' },
			];

			const response = responses[utils.getRandomInt(0, responses.length - 1)];
			const msg = await this.sendMessage(message.channel, response.search);

			let res = await this._birbCache.get();

			return msg.edit({
				content: response.found,
				embed: {
					title: 'Tweet Tweet..',
					color: 0x008080,
					image: {
						url: `https://random.birb.pw/img/${res.text}`,
					},
					url: `https://random.birb.pw/img/${res.text}`,
				},
			});
		} catch (err) {
			return this.error(message.channel, errorText);
		}
	}
}

module.exports = Birb;

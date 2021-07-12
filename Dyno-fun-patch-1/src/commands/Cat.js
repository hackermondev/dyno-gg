const { Command } = require('@dyno.gg/dyno-core');
const superagent = require('superagent');


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

			let res = await superagent.get('http://thecatapi.com/api/images/get?format=src&results_per_page=1');

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

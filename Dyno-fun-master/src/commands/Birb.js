const { Command } = require('@dyno.gg/dyno-core');
const superagent = require('superagent');


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
    }

    async execute({ message }) {
		const errorText = `Error: ${this.config.emojis.sadcat || '🐦'} No birds found.`;

        try {
			const utils = this.utils;
			const responses = [
				{ search: 'Looking for a birdies...', found: 'Found one!' },
			];

			const response = responses[utils.getRandomInt(0, responses.length - 1)];
			const msg = await this.sendMessage(message.channel, response.search);

			let res = await superagent.get('https://random.birb.pw/tweet/');


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

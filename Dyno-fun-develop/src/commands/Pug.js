const { Command } = require('@dyno.gg/dyno-core');
const Prefetcher = require('../Prefetcher');

class Pug extends Command {
    constructor(...args) {
        super(...args);

        this.aliases      = ['pug', 'carti'];
        this.module       = 'Fun';
        this.description  = 'Find some cute pug pictures';
        this.usage        = 'pug';
        this.example      = 'pug';
        this.cooldown     = 7500;
        this.expectedArgs = 0;
        this._pugCache     = new Prefetcher('https://dog.ceo/api/breed/pug/images/random');

        this._pugCache.init();
    }

    async execute({ message }) {
        const errorText = `Error: ${this.config.emojis.saddog || ''} No pugs found.`;

         try {
            const utils = this.utils;
			const responses = [
				{ search: 'Finding a puggo...', found: this.config.emojis.carti || '<a:carti:393640270945845258>' },
			];

			const response = responses[utils.getRandomInt(0, responses.length - 1)];
            const msg = await this.sendMessage(message.channel, response.search);

			let res = await this._pugCache.get();

            if (!res || !res.body || !res.body.message) {
                return this.error(message.channel, errorText);
            }

            return msg.edit({
                content: response.found,
                embed: {
                    title: `${this.config.emojis.dog || '🐶'} Ruff!`,
                    color: 0x3498db,
                    image: {
                        url: res.body.message,
                    },
                    url: res.body.message,
                },
            });
        } catch (err) {
            return this.error(message.channel, errorText);
        }
    }
}

module.exports = Pug;

import { Command, CommandData } from '@dyno.gg/dyno-core';
import * as superagent from 'superagent';

export default class Pug extends Command {
	public aliases     : string[] = ['pug', 'carti'];
	public module      : string   = 'Fun';
	public description : string   = 'Find some cute pug pictures.';
	public usage	   : string   = 'pug';
	public example	   : string   = 'pug';
	public cooldown    : number   = 5000;
	public expectedArgs: number   = 0;

	public async execute({ message }: CommandData) {
		const errorText = `Error: ${this.config.emojis.saddog || ''} No pugs found.`;

		try {
			const utils = this.utils;
			const responses = [
				{ search: 'Finding a puggo...', found: this.config.emojis.carti || '<a:carti:393640270945845258>' },
			];

			const response = responses[utils.getRandomInt(0, responses.length - 1)];
			const msg = await this.sendMessage(message.channel, response.search);

			const res = await superagent.get('https://dog.ceo/api/breed/pug/images/random');

			if (!res || !res.body || !res.body.message) {
				return this.error(message.channel, errorText);
			}

			return msg.edit({
				// content: response.found,
				embed: {
					title: `${this.config.emojis.dog || '🐶'} Ruff!`,
					color: 0x3498DB,
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

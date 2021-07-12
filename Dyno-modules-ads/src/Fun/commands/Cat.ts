import { Command, CommandData } from '@dyno.gg/dyno-core';
import * as superagent from 'superagent';

export default class Cat extends Command {
	public aliases     : string[] = ['cat'];
	public module      : string   = 'Fun';
	public description : string   = 'Find some cute cat pictures.';
	public usage	   : string   = 'cat';
	public example	   : string   = 'cat';
	public cooldown    : number   = 5000;
	public expectedArgs: number   = 0;

	public async execute({ message }: CommandData) {
		const errorText = `Error: ${this.config.emojis.sadcat || '😿'} No cats found.`;

		try {
			const utils = this.utils;
			const responses = [
				{ search: 'Looking for a kitty...', found: 'Found one!' },
			];

			const response = responses[utils.getRandomInt(0, responses.length - 1)];
			const msg = await this.sendMessage(message.channel, response.search);

			const res = await superagent.get('https://api.thecatapi.com/v1/images/search');

			if (!res || !res.body || !res.body[0]) {
				return this.error(message.channel, errorText);
			}

			return msg.edit({
				content: response.found,
				embed: {
					title: '🐱 Meowww..',
					color: 0x3498DB,
					image: {
						url: res.body[0].url,
					},
					url: res.body[0].url,
				},
			});
		} catch (err) {
			this.logger.error(err);
			return this.error(message.channel, errorText);
		}
	}
}

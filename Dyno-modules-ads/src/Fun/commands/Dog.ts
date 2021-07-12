import { Command, CommandData } from '@dyno.gg/dyno-core';
import * as superagent from 'superagent';

export default class Dog extends Command {
	public aliases     : string[] = ['dog', 'doggo'];
	public module      : string   = 'Fun';
	public description : string   = 'Find some cute dog pictures.';
	public usage	   : string   = 'dog';
	public example	   : string   = 'dog';
	public cooldown    : number   = 5000;
	public expectedArgs: number   = 0;

	public async execute({ message }: CommandData) {
		const errorText = `Error: ${this.config.emojis.saddog || ''} No dogs found.`;

		try {
			const utils = this.utils;
			const responses = [
				{ search: 'Looking for a doggo...', found: 'Found one!' },
			];

			const response = responses[utils.getRandomInt(0, responses.length - 1)];
			const msg = await this.sendMessage(message.channel, response.search);

			const res = await superagent.get('https://dog.ceo/api/breeds/image/random');

			if (!res || !res.body || !res.body.message) {
				return this.error(message.channel, errorText);
			}

			return msg.edit({
				content: response.found,
				embed: {
					title: `${this.config.emojis.dog || '🐶'} Woof!`,
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

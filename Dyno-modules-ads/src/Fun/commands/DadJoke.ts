import { Command, CommandData } from '@dyno.gg/dyno-core';
import * as superagent from 'superagent';

export default class DadJoke extends Command {
	public aliases     : string[] = ['dadjoke', 'badjoke'];
	public module      : string   = 'Fun';
	public description : string   = 'Get a random Dad joke.';
	public usage	   : string   = 'dadjoke';
	public example	   : string   = 'dadjoke';
	public cooldown    : number   = 5000;
	public expectedArgs: number   = 0;

	public async execute({ message }: CommandData) {
		try {
			const res = await superagent
				.get('https://icanhazdadjoke.com/')
				.set({ Accept: 'application/json' });

			return this.sendMessage(message.channel, JSON.parse(res.text).joke);
		} catch (err) {
			return this.error(message.channel, 'Error 404: Humor module not found!');
		}
	}
}

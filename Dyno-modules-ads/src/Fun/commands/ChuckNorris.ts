import { Command, CommandData } from '@dyno.gg/dyno-core';
import * as superagent from 'superagent';

export default class ChuckNorris extends Command {
	public aliases     : string[] = ['norris', 'chucknorris'];
	public module      : string   = 'Fun';
	public description : string   = 'Get a random Chuck Norris fact.';
	public usage	   : string   = 'norris';
	public example	   : string   = 'norris';
	public cooldown    : number   = 5000;
	public expectedArgs: number   = 0;

	public async execute({ message }: CommandData) {
		try {
			const res = await superagent.get('https://api.icndb.com/jokes/random');

			return this.sendMessage(message.channel, res.body.value.joke);
		} catch (err) {
			return this.error(message.channel, 'No facts founds.. Something went wrong.');
		}
	}
}

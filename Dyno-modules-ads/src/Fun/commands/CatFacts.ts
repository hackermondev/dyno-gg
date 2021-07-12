import { Command, CommandData } from '@dyno.gg/dyno-core';
import * as superagent from 'superagent';

export default class CatFacts extends Command {
	public aliases     : string[] = ['catfact'];
	public module      : string   = 'Fun';
	public description : string   = 'Get random Cat Facts with this commmand.';
	public usage	   : string   = 'catfact';
	public example	   : string   = 'catfact';
	public cooldown    : number   = 5000;
	public expectedArgs: number   = 0;

	public async execute({ message }: CommandData) {
		try {
			const res = await superagent.get('https://catfact.ninja/fact');

			return this.sendMessage(message.channel, res.body.fact);
		} catch (err) {
			return this.error(message.channel, 'No Cat facts founds.. Something went wrong.');
		}
	}
}

import { Command, CommandData } from '@dyno.gg/dyno-core';

export default class Flip extends Command {
	public aliases     : string[] = ['flip'];
	public module      : string   = 'Fun';
	public description : string   = 'Flip a coin.';
	public usage	   : string   = 'flip';
	public example	   : string   = 'flip';
	public cooldown    : number   = 5000;
	public expectedArgs: number   = 0;

	public execute({ message }: CommandData) {
		const result = (Math.floor(Math.random() * 2) === 0) ? 'heads' : 'tails';
		return this.sendMessage(message.channel, `${message.author.mention} ${result}`);
	}
}

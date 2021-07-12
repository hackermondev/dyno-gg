import { Command, CommandData } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class AdorableAvatar extends Command {
	public aliases     : string[] = ['adorable'];
	public module      : string   = 'Fun';
	public description : string   = 'Get an adorable avatar based on an identifier.';
	public usage	   : string   = 'adorable [identifier]';
	public example	   : string   = 'adorable Eleos';
	public cooldown    : number   = 5000;
	public expectedArgs: number   = 1;

	public execute({ message, args }: CommandData) {
		const search = args.join('-');
		const embed = this.buildEmbed({
			title: `Getting an adorable ${search}!`,
			color: 0x3498DB,
			image: {
				url: `https://api.adorable.io/avatars/285/${search}.png`,
			},
			url: `https://api.adorable.io/avatars/285/${search}.png`,
		}, true);

		return this.sendMessage(message.channel, { embed });
	}
}

import {Command} from '@dyno.gg/dyno-core';
import * as core from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

/**
 * Ranks command
 * @class Ranks
 * @extends Command
 */
export default class Ranks extends Command {
	public aliases     : string[] = ['ranks'];
	public group       : string   = 'Roles';
	public module      : string   = 'Autoroles';
	public description : string   = 'Get a list of joinable ranks.';
	public usage       : string   = 'ranks';
	public example     : string   = 'ranks';
	public cooldown    : number   = 10000;
	public expectedArgs: number   = 0;

	public async execute({ message }: core.CommandData): Promise<{}> {
		const Autoroles = this.dyno.modules.get('Autoroles');

		try {
			const ranks = await Autoroles.ranks.getRanks((<eris.TextChannel>message.channel).guild);
			return this.sendMessage(message.channel, ranks);
		} catch (err) {
			return this.error(message.channel, 'Something went wrong.', err);
		}
	}
}

import {Command} from '@dyno.gg/dyno-core';
import * as core from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

/**
 * Rank command
 * @class Rank
 * @extends Command
 */
export default class Rank extends Command {
	public aliases     : string[] = ['rank', 'team'];
	public group       : string   = 'Roles';
	public module      : string   = 'Autoroles';
	public description : string   = 'Join/leave a rank';
	public usage       : string   = 'rank [rank name]';
	public example     : string   = 'rank Mystic';
	public cooldown    : number   = 2000;
	public expectedArgs: number   = 1;
	public permissions : string[] = ['manageRoles'];

	public execute({ message, args }: core.CommandData): Promise<{}> {
		const Autoroles = this.dyno.modules.get('Autoroles');
		const rank = args.join(' ');

		if (!message.member) {
			return this.error(message.channel, `I couldn't find that user.`);
		}

		return Autoroles.ranks.toggleRank(message, rank)
			.then((res: string) => this.sendMessage(message.channel, res))
			.catch((err: string) => this.error(message.channel, err));
	}
}

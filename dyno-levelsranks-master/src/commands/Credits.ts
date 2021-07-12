import {Command} from '@dyno.gg/dyno-core';
import * as dyno from 'Dyno';

export default class Credits extends Command {
	public group        : string   = 'Misc';
	public aliases      : string[] = ['credits'];
	public description  : string   = 'Check how much credits you have';
	public defaultUsage : string   = 'credits';
	public expectedArgs : number   = 0;
	public cooldown     : number   = 6000;
	public disableDM    : boolean  = false;
	public usage        : string   = 'credits';
	public example      : string   = 'credits';

	public async execute({ message, args, guildConfig } : any): Promise<any> {
		try {
			const levelsranks = this.dyno.modules.get('LevelsRanks');

			const credits = await levelsranks._credits.getCredits(message.author.id);

			return this.sendMessage(message.channel, `${message.author.username}, you have ${credits} credits`);
		} catch (e) {
			this.logger.error(e);
		}
	}
}

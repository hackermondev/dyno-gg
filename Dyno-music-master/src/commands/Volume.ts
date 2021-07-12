import { Command, CommandData } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Volume extends Command {
	public aliases     : string[] = ['volume', 'vol'];
	public group       : string   = 'Music';
	public description : string   = 'Get or Change the music volume.';
	public usage       : string   = 'volume [1-100]';
	public example     : string   = 'volume 80';
	public cooldown    : number   = 10000;
	public expectedArgs: number   = 0;
	public permissions: string = 'serverMod';

	public async execute({ message, args, guildConfig }: CommandData) {
		const music = this.dyno.modules.get('Music');

		if (!music.canCommand(message, true)) {
			return Promise.reject(null);
		}

		if (!guildConfig.isPremium) {
			return this.sendMessage(message.channel,
				`This feature is available in premium, see <${this.config.site.host}/upgrade> for details.`, { deleteAfter: 30000 });
		}

		if (!args.length) {
			try {
				const volume = await music.getVolume((<eris.GuildChannel>message.channel).guild);
				return this.sendMessage(message.channel, `**Volume:** ${(volume / 1.5)}`);
			} catch (err) {
				return this.error(message.channel, `Something went wrong.`);
			}
		}

		const vol = parseInt(args[0], 10);

		if (vol < 1 || vol > 100) {
			return this.error(message.channel, 'Volume must be between 1-100');
		}

		music.setVolume(message, vol);
		return this.sendMessage(message.channel, 'The volume was changed.');
	}
}

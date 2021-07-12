import { Command, CommandData } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class NowPlaying extends Command {
	public aliases     : string[] = ['nowplaying'];
	public group       : string   = 'Music';
	public description : string   = 'Show the currently playing song.';
	public usage       : string   = 'nowplaying';
	public example     : string   = 'nowplaying';
	public cooldown    : number   = 8000;
	public expectedArgs: number   = 0;

	public execute({ message }: CommandData) {
		const music = this.dyno.modules.get('Music');
		if (!music.canCommand(message)) {
			return Promise.reject(null);
		}

		const player = music.getPlayer((<eris.GuildChannel>message.channel).guild);

		if (!player) {
			return this.error(message.channel, `There's nothing playing.`);
		}

		player.announce(null, message.channel);
		return Promise.resolve();
	}
}

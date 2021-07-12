import { Command, CommandData } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Stop extends Command {
	public aliases     : string[] = ['stop'];
	public group       : string   = 'Music';
	public description : string   = 'Stop the current song.';
	public usage       : string   = 'stop';
	public example     : string   = 'stop';
	public cooldown    : number   = 6000;
	public expectedArgs: number   = 0;

	public execute({ message }: CommandData) {
		const music = this.dyno.modules.get('Music');

		if (!music.canCommand(message, true)) {
			return Promise.reject(null);
		}

		const voiceChannel = this.getVoiceChannel(message.member);
		if (!voiceChannel) {
			return this.error(message.channel, 'You should be in a voice channel first.');
		}

		let player = music.getPlayer((<eris.GuildChannel>message.channel).guild);
		if (!player) {
			try {
				this.client.leaveVoiceChannel(voiceChannel.id);
			} catch (err) {
				this.logger.error(err);
			}
			return Promise.resolve();
		}

		player.stop(true);
		player = null;
		return Promise.resolve();
	}

}

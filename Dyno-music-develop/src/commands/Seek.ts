import { Command, CommandData } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as toTime from 'to-time';

export default class Seek extends Command {
	public aliases     : string[] = ['seek'];
	public group       : string   = 'Music';
	public description : string   = 'Seek to a position in the song.';
	public usage       : string   = 'seek [time]';
	public example     : string   = 'seek 1m 30s';
	public cooldown    : number   = 5000;
	public expectedArgs: number   = 0;

	public execute({ message, args, guildConfig }: CommandData) {
		if (!this.config.isPremium && !this.config.test) {
			return Promise.reject(null);
		}

		const music = this.dyno.modules.get('Music');
		if (!music.canCommand(message, true)) {
			return Promise.reject(null);
		}

		const voiceChannel = this.getVoiceChannel(message.member);
		if (!voiceChannel) {
			return this.error(message.channel, 'You should be in a voice channel first.');
		}

		const player = music.getPlayer((<eris.GuildChannel>message.channel).guild);
		if (!player) {
			return this.error(message.channel, `Not currently playing.`);
		}

		const position = toTime(args.join(' ')).ms();
		if (!position || isNaN(position)) {
			return this.error(message.channel, 'Invalid time');
		}

		player.seek(message, position).catch((err: any) => {
			return this.error(message.channel, err);
		});
	}
}

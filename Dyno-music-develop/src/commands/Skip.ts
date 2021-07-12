import { Command, CommandData } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Skip extends Command {
	public aliases     : string[] = ['skip'];
	public group       : string   = 'Music';
	public description : string   = 'Skip the current song.';
	public usage       : string   = 'skip';
	public example     : string   = 'skip';
	public cooldown    : number   = 5000;
	public expectedArgs: number   = 0;

	public execute({ message, guildConfig }: CommandData) {
		const music = this.dyno.modules.get('Music');
		const isCommander = music.isCommander(message);
		const force = isCommander || this.isServerMod(message.member, message.channel);
		const guild = (<eris.GuildChannel>message.channel).guild;

		if (!music.canCommand(message)) {
			return Promise.reject(null);
		}

		if (!music.canPlayInChannel(message)) {
			const musicChannel = guild.channels.get(guildConfig.music.channel);
			if (musicChannel) {
				return this.error(message.channel, `Music commands are limited to the <#${musicChannel.id}> channel`);
			}
			return this.error(message.channel, `Music commands can't be played here.`);
		}

		const voiceChannel = this.getVoiceChannel(message.member);
		if (!voiceChannel) {
			return this.error(message.channel, 'You should be in a voice channel first.');
		}

		if (guildConfig.music && guildConfig.music.skipEnabled === false && !force) {
			return this.sendMessage(message.channel, `${message.author.mention}, skip vote is disabled on this server.`,
				{ deleteAfter: 9000 });
		}

		const player = music.getPlayer(guild);
		if (!player) {
			return this.error(message.channel, `Not currently playing.`);
		}

		return player.skip(message, guildConfig, force);
	}

}

'use strict';

const Command = Loader.require('./core/structures/Command');

class Stop extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['stop'];
		this.group        = 'Music';
		this.description  = 'Stop playing';
		this.usage        = `stop`;
		this.cooldown     = 6000;
		this.expectedArgs = 0;
	}

	execute({ message }) {
		let music = this.dyno.modules.get('Music');

		if (!music.canCommand(message, true)) return Promise.reject();

		const voiceChannel = this.getVoiceChannel(message.member);
		if (!voiceChannel) {
			return this.error(message.channel, 'You should be in a voice channel first.');
		}

		return music.player.stop(voiceChannel, true);
	}

}

module.exports = Stop;

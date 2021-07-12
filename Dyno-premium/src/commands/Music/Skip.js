'use strict';

const Command = Loader.require('./core/structures/Command');

class Skip extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['skip'];
		this.group        = 'Music';
		this.description  = 'Skip the currently playing song';
		this.usage        = `skip`;
		this.cooldown     = 8000;
		this.expectedArgs = 0;
	}

	execute({ message, guildConfig }) {
		let music = this.dyno.modules.get('Music'),
			isCommander = music.isCommander(message),
			force = isCommander || this.isServerMod(message.member, message.channel);

		if (!music.canCommand(message)) return Promise.reject();

		let voiceChannel = this.getVoiceChannel(message.member);
		if (!voiceChannel) {
			return this.error(message.channel, 'You should be in a voice channel first.');
		}

		if (guildConfig.music && guildConfig.music.skipEnabled === false && !force) {
			return this.sendMessage(message.channel, `${message.author.mention}, skip vote is disabled on this server.`,
				{ deleteAfter: 9000 });
		}

		return music.skip(message, force);
	}

}

module.exports = Skip;

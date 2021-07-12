'use strict';

const Command = Loader.require('./core/structures/Command');

class Volume extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['volume', 'vol'];
		this.group        = 'Music';
		this.description  = 'No longer available for performance. Use the volume command for more info.';
		this.usage        = `volume`;
		this.permissions  = 'serverMod';
		this.cooldown     = 10000;
		this.expectedArgs = 0;
	}

	execute({ message, args, guildConfig }) {
		if (!guildConfig.isPremium) {
			const msgArray = [
				`:warning: In order to provide significantly better music performance, the volume command is disabled for public Dyno.`,
				`You can upgrade Dyno to enable this feature and more at <${this.config.site.host}/upgrade>`,
			];

			return this.sendMessage(message.channel, msgArray, { deleteAfter: 30000 });
		}

		let music = this.dyno.modules.get('Music');

		if (!music.canCommand(message, true)) return Promise.reject();

		let voiceChannel = this.getVoiceChannel(message.member);
		if (!voiceChannel) return this.error(message.channel, 'You should be in a voice channel first.');

		if (!args.length) {
			let vol = music.volume.get(message.channel.guild.id) || 1.5;
			return this.sendMessage(message.channel, `**Global Volume:** ${(vol / 2) * 100}`);
		}

		const vol = parseInt(args[0]);

		if (vol < 1 || vol > 100) {
			return this.error(message.channel, 'Volume must be between 1-100');
		}

		music.setVolume(message, vol);
		return this.sendMessage(message.channel, 'The global volume was changed. It will take effect in the next song.');
	}

}

module.exports = Volume;

'use strict';

const Command = Loader.require('./core/structures/Command');
const utils = Loader.require('./core/utils');

class Play extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['play', 'add'];
		this.group        = 'Music';
		this.description  = 'Add a song to queue and play';
		this.usage        = ['play [url]', 'play [song name]', 'play [number]'];
		this.defaultUsage = 'play [url]';
		this.expectedArgs = 0;
		this.cooldown     = 6000;
		this.disableDM    = true;
	}

	async execute({ message, args }) {
		const music = this.dyno.modules.get('Music');
		const searcher = music.search;

		if (!music.canCommand(message)) {
			return this.error(message.channel, `You don't have permissions to use that command.`);
		}

		const voiceChannel = this.client.getChannel(message.member.voiceState.channelID);
		if (!voiceChannel) {
			return this.error(message.channel, 'You should be in a voice channel first.');
		}

		if (await music.isStreamLimited(message.guild)) {
			return this.sendMessage(message.channel, [
				`**Sorry, our music server is currently at peak capacity <:DynoSweats:342841357104316416>**`,
				`**You can try again in a little while, or upgrade to premium if you want to use that feature right now.**`
			]);
		}

		// No arguments, start playing
		if (!args.length && !music.getPlayingState(voiceChannel)) {
			return music.play(voiceChannel)
				.catch(err => this.error(message.channel, err));
		}

		const queue = await music.queue.fetch(message.channel.guild.id);

		if (!args.length) {
			if (!queue || !queue.length) {
				return this.sendMessage(message.channel, `The queue is empty. Add a song to play.`);
			}

			return Promise.reject('no args.length after playing state check');
		}

		// Play a song in queue by number
		if (!isNaN(args[0]) && args.length === 1) {
			if (parseInt(args[0]) > queue.length) {
				return this.error(message.channel, 'That song is not in queue.');
			}

			return music.playByIndex(message.channel.guild.id, voiceChannel, args[0])
				.catch(() => this.error(message.channel, `That song is not in queue.`));
		}

		try {
			// check if it's a youtube url
			let url = args[0].replace(/<|>/g, '');
			const res = await utils.validateYoutube(url);

			if (res) {
				return music.add(message.channel.guild.id, voiceChannel, `https://www.youtube.com/watch?v=${res}`)
					.then(info => this.sendMessage(message.channel, `Added ${info.title} to the queue.`))
					.catch(err => {
						if (err === '20m') {
							let msgArray = [
								`The song is longer than 30 minutes, this is limited for performance.`,
							];
							if (this.isServerMod(message.member, message.channel)) {
								msgArray.push(`You can upgrade Dyno to enable this feature and more at <${this.config.site.host}/upgrade>`);
							}
							return this.sendMessage(message.channel, msgArray);
						}
						if (err === '60m') {
							if (this.isServerMod(message.member, message.channel)) {
								return this.sendMessage(message.channel, [
									`The song is longer than 60 minutes, this is limited for performance purposes.`,
									`You can upgrade Dyno to enable this feature and more at <${this.config.site.host}/upgrade>`
									]);
							}

							return this.sendMessage(message.channel, `The song is longer than 60 minutes.`);
						}
						return this.error(message.channel, `An error occurred: ${err}`);
					});
			}
		} catch (e) {
			// pass
		}

		try {
			// search by song name
			var result = await searcher.search(message, 'video', args.join(' '), 10);
		} catch (err) {
			return this.sendMessage(message.channel, 'An error occurred\n' + err);
		}

		if (!result) {
			return this.error(message.channel, 'Failed to get search results.');
		}

		try {
			await music.add(message.channel.guild.id, voiceChannel, result);
		} catch (err) {
			if (err === '20m') {
				let msgArray = [
					`The song is longer than 30 minutes, this is limited for performance.`,
				];
				if (this.isServerMod(message.member, message.channel)) {
					msgArray.push(`You can upgrade Dyno to enable this feature and more at <${this.config.site.host}/upgrade>`);
				}
				return this.sendMessage(message.channel, msgArray);
			}
			if (err === '60m' && this.isServerMod(message.member, message.channel)) {
				return this.sendMessage(message.channel, [
					`The song is longer than 60 minutes, this is limited for performance purposes.`,
					`You can upgrade Dyno to enable this feature and more at <${this.config.site.host}/upgrade>`
					]);
			}
			return this.error(message.channel, err);
		}

		return this.sendMessage(message.channel, `Added ${result.title} to the queue.`);
	}

}

module.exports = Play;

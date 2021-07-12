'use strict';

const Command = Loader.require('./core/structures/Command');

class Youtube extends Command {
	constructor(...args) {
		super(...args);

		this.aliases        = ['yt', 'youtube'];
		this.group          = 'Music';
		this.description    = 'Youtube commands';
		this.cooldown       = 3000;
		this.expectedArgs   = 1;
		this.defaultCommand = 'search';
		this.defaultUsage   = 'yt [song name]';

		this.commands = [
			{ name: 'search', desc: 'Search for a song on youtube', default: true, usage: 'search [song name]', cooldown: 5000 },
			{ name: 'next', desc: 'Get the next search result', usage: 'next', cooldown: 3000 },
			{ name: 'prev', desc: 'Get the previous search result', usage: 'prev', cooldown: 3000 },
			{ name: 'add', desc: 'Add the last search result to queue.', usage: 'add', cooldown: 10000 },
		];

		this.usage = [
			'yt [song name]',
			'yt next',
			'yt prev',
			'yt add',
		];
	}

	/**
	 * Format search result
	 * @param  {Object} result Search item object
	 * @returns {Array}         Message array
	 */
	formatMessage(result) {
		let msgArray = [];

		msgArray.push(`Title: ${result.title}`);
		msgArray.push(`Link: <${result.url}>`);

		if (result.thumbnail_url) {
			msgArray.push(result.thumbnail_url);
		}

		return msgArray;
	}

	/**
	 * Execute Command
	 * @param  {Object} message  discord.js message resolvable
	 * @returns {Promise|void}
	 */
	execute({ message }) {
		this._music = this.dyno.modules.get('Music');
		this._searcher = this._music.search;
		this._type = null;

		if (!this._music.canCommand(message, true)) return Promise.reject();
		return Promise.resolve();
	}

	/**
	 * Search youtube
	 * @param  {Object} message  discord.js message resolvable
	 * @param  {Array} args  Command arguments
	 * @returns {Promise}
	 */
	async search(message, args) {
		try {
			var result = await this._searcher.search(message, this._type, args.join(' '));
		} catch (err) {
			if (err) {
				this.logger.error(err, {
					type: 'youtube.search',
					guild: message.channel.guild.id,
					shard: message.channel.guild.shard.id,
					query: args.join(' '),
				});
			}
			return this.error(message.channel, 'Failed to get search results.');
		}

		if (!result) {
			return this.error(message.channel, 'Failed to get search results.');
		}

		return this.sendMessage(message.channel, this.formatMessage(result));
	}

	/**
	 * Search for playlists
	 * @param  {Object} message  discord.js message resolvable
	 * @param  {Array} args  Command arguments
	 * @returns {Promise}
	 */
	playlist(message, args) {
		this._type = 'playlist';
		return this.search(message, args);
	}

	/**
	 * Get the next search result
	 * @param  {Object}   message discord.js message resolvable
	 * @returns {Promise}
	 */
	next(message) {
		const result = this._searcher.next(message);

		if (!result) {
			return this.sendMessage(message.channel, 'No more results.');
		}

		return this.sendMessage(message.channel, this.formatMessage(result));
	}

	/**
	 * Get the previous search result
	 * @param  {Object}   message discord.js message resolvable
	 * @returns {Promise}
	 */
	prev(message) {
		const result = this._searcher.prev(message);

		if (!result) {
			return this.sendMessage(message.channel, 'No previous results.');
		}

		return this.sendMessage(message.channel, this.formatMessage(result));
	}

	/**
	 * Add the last result to the queue/playlist
	 * @param {Object} message discord.js message resolvable
	 * @returns {Promise}
	 */
	async add(message) {
		let voiceChannel = this.getVoiceChannel(message.member);
		if (!voiceChannel) {
			return this.error(message.channel, 'You should be in a voice channel first.');
		}

		const result = this._searcher.get(message);
		if (!result || !result.type) {
			return this.error(message.channel, 'Failed to get last search.');
		}

		if (await music.isStreamLimited(message.guild)) {
			return this.sendMessage(message.channel, [
				`**Sorry, our music server is currently at peak capacity <:DynoSweats:342841357104316416>**`,
				`**You can try again in a little while, or upgrade to premium if you want to use that feature right now.**`
			]);
		}

		if (result.type === 'video') {
			return this._music.add(message.channel.guild.id, voiceChannel, result)
				.then(() => this.sendMessage(message.channel, `Added ${result.title} to the queue.`))
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

					return this.error(message.channel, err);
				});
		}

		if (result.type === 'playlist') {
			return this.sendMessage(message.channel, `I'm unable to queue youtube playlists at this time. The feature will be enabled again soon.`);
		}

		// if (result.type === 'playlist') {
		// 	try {
		// 		const items = await this._searcher.playlist(message, result.video_id);

		// 		for (let item of items) {
		// 			this._music.add(message.channel.guild.id, voiceChannel, item);
		// 		}

		// 		return this.sendMessage(message.channel, `Added ${items.length} items to the queue.`);
		// 	} catch (err) {
		// 		this.logger.error(err);
		// 		return this.error(message.channel, 'An error occurred');
		// 	}
		// }

		return Promise.resolve();
	}
}

module.exports = Youtube;

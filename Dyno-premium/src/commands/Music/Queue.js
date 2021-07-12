'use strict';

const Command = Loader.require('./core/structures/Command');

class Queue extends Command {
	constructor(...args) {
		super(...args);

		this.aliases        = ['queue', 'q'];
		this.group          = 'Music';
		this.description    = 'List the songs in queue';
		this.cooldown       = 3000;
		this.expectedArgs   = 1;
		this.disableDM      = true;
		this.defaultCommand = 'list';
		this.defaultUsage   = 'queue list';

		this.commands = [
			{ name: 'list', desc: 'List the songs in the music queue.', default: true, usage: 'list', cooldown: 5000 },
			{ name: 'remove', desc: 'Remove a song from the music queue.', usage: 'remove [number]', cooldown: 2000 },
			{ name: 'clear', desc: 'Clears the entire music queue (Irreversable).', usage: 'queue clear', cooldown: 10000 },
			{ name: 'repeat', desc: 'Enable/disable repeating the music queue.', usage: 'queue repeat', cooldown: 5000 },
			{ name: 'shuffle', desc: 'Shuffle the music queue.', usage: 'queue shuffle', cooldown: 5000 },
		];

		this.usage = [
			'queue list',
			'queue remove [number]',
			'queue clear',
			'queue repeat',
			'queue shuffle',
		];
	}

	execute() {
		this._music = this.dyno.modules.get('Music');
		return Promise.resolve();
	}

	async list(message) {
		if (!this._music.canCommand(message)) return Promise.reject();

		let list = await this._music.queue.fetch(message.channel.guild.id);
		let msgArray = [];

		if (!list || !list.length) {
			return this.sendMessage(message.channel, 'The queue is empty.');
		}

		const length = list.length > 10 ? `10/${list.length}` : list.length;
		const footer = [
			`Showing ${length} songs.`,
			`For a full list go to <${this.config.site.host}/playlist/${message.channel.guild.id}>`,
		];

		if (list.length > 10) {
			list = list.slice(0, 10);
		}

		msgArray.push('```');
		for (let i in list) {
			let info = list[i];
			msgArray.push(`${++i}: ${info.title}`);
		}
		msgArray.push('```');

		if (footer) msgArray = msgArray.concat(footer);

		return this.sendMessage(message.channel, msgArray);
	}

	repeat(message) {
		if (!this._music.canCommand(message, true)) return Promise.reject();
		return this._music.toggleRepeat(message);
	}

	async remove(message, args) {
		if (!this._music.canCommand(message, true)) return Promise.reject();

		const index = (args.length && !isNaN(parseInt(args[0], 10))) ? args[0] : 1;
		const result = await this._music.queue.remove(message.channel.guild.id, index)
			.catch(err => this.sendMessage(message.channel, err));

		if (!result) {
			return this.sendMessage(message.channel, `Nothing to remove.`);
		}

		return this.sendMessage(message.channel, `Removed ${result.title}`);
	}

	clear(message) {
		if (!this._music.canCommand(message, true)) return Promise.reject();

		this._music.queue.clear(message.channel.guild.id);
		return this.sendMessage(message.channel, 'The queue was cleared.');
	}

	shuffle(message) {
		if (!this._music.canCommand(message, true)) return Promise.reject();

		this._music.queue.shuffle(message.channel.guild.id);

		return this.list(message);
	}
}

module.exports = Queue;

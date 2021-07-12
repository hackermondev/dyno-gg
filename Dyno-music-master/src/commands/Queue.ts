import { Command, CommandData, SubCommand } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as moment from 'moment';
import 'moment-duration-format';
import Duration from '../types/duration';

export default class Queue extends Command {
	public aliases       : string[] = ['queue', 'q'];
	public group         : string   = 'Music';
	public description   : string   = 'List the songs in queue';
	public cooldown      : number   = 3000;
	public expectedArgs  : number   = 1;
	public disableDM     : boolean  = true;
	public defaultCommand: string   = 'list';
	public defaultUsage  : string   = 'queue list';

	public commands: SubCommand[] = [
		{ name: 'list',   desc: 'List the songs in the music queue.', usage: 'list', cooldown: 5000, default: true },
		{ name: 'remove', desc: 'Remove a song from the music queue.', usage: 'remove [number]', cooldown: 2000 },
		{ name: 'clear',  desc: 'Clears the entire music queue (Irreversable).', usage: 'clear', cooldown: 10000 },
		{ name: 'repeat', desc: 'Enable/disable repeating the music queue.', usage: 'repeat', cooldown: 5000 },
		{ name: 'shuffle', desc: 'Shuffle the music queue.', usage: 'shuffle', cooldown: 5000 },
		{ name: 'save',   desc: 'Save a queue by name to load later', usage: 'save [name]', cooldown: 5000 },
		{ name: 'load',   desc: 'Load a saved queue, replacing the current queue.', usage: 'load [name]', cooldown: 5000 },
		{ name: 'delete', desc: 'Delete a saved queue.', usage: 'delete [name]', cooldown: 5000 },
		{ name: 'saved',  desc: 'List saved queues.', usage: 'saved', cooldown: 5000 },
	];

	public usage: string[] = [
		'queue remove [number]',
		'queue save [name]',
		'queue load [name]',
		'queue delete [name]',
	];

	public example: string[] = [
		'queue list',
		'queue remove',
		'queue remove 5',
		'queue clear',
		'queue repeat',
		'queue shuffle',
		'queue save fuzzypop',
		'queue load fuzzypop',
		'queue delete fuzzypop',
		'queue saved',
	];

	public execute() {
		return Promise.resolve();
	}

	public async list({ message, guildConfig }: CommandData): Promise<any> {
		const music = await this.getModule('Music');
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

		const msgArray = [];
		let queue;

		try {
			queue = await music.getQueue(guild.id);
		} catch (err) {
			this.logger.error(err);
		}

		let list = queue.items;

		if (!list || !list.length) {
			return this.sendMessage(message.channel, 'The queue is empty.');
		}

		let queueLength = list.reduce((a: number, b: any) => {
			const length = b.v === 4 ? b.length : b.length;
			if (length > 37000) {
				return a;
			}
			a += length || 0;
			return a;
		}, 0);

		const footer = [
			`**For a full list head over to the [Playlist page](${this.config.site.host}/playlist/${guild.id})**`,
		];

		if (list.length > 10) {
			list = list.slice(0, 10);
		}

		const fields = [];

		for (let i = 0; i < list.length; i++) {
			const trackInfo = list[i];
			let length = trackInfo.v === 4 ? trackInfo.length : trackInfo.length;
			if (length) {
				length = (<Duration>moment.duration(length, 'seconds')).format('h[h] m[m] s[s]');
			}
			let title = trackInfo.title.length > 52 ? `${trackInfo.title.substr(0, 52)}...` : trackInfo.title;
			title = title.replace(/(\(|\)|\[|\])/g, '');
			const line = `${i + 1}. Length: ${length}`;
			fields.push({ name: line, value: `[${title}](${trackInfo.uri || trackInfo.url})` });
		}

		queueLength = (<Duration>moment.duration(queueLength, 'seconds')).format('h[h] m[m] s[s]');

		const embed: eris.EmbedBase = {
			color: this.utils.getColor('blue'),
			author: {
				name: `Listing the queue for ${guild.name}`,
			},
			description: `\u200B\n${footer.join('\n')}`,
			fields: fields,
			// description: `\u200B\n${fields.join('\n' )}\n\n${footer.join('\n')}`,
			footer: { text: `${queue.items.length} songs, ${queueLength} in queue. `},
			timestamp: (new Date()).toISOString(),
		};

		if (guild.iconURL) {
			embed.author.icon_url = guild.iconURL;
		}

		return this.sendMessage(message.channel, { embed });
	}

	public async repeat({ message, guildConfig }: CommandData): Promise<{}> {
		const music = this.dyno.modules.get('Music');

		if (!music.canCommand(message, true)) {
			return Promise.reject(null);
		}

		try {
			const result = await music.toggleRepeat(message, guildConfig);
			return this.success(message.channel, result);
		} catch (err) {
			return this.error(message.channel, err);
		}
	}

	public async remove({ message, args }: CommandData): Promise<{}> {
		const music = this.dyno.modules.get('Music');
		const guild = (<eris.GuildChannel>message.channel).guild;

		if (!music.canCommand(message, true)) {
			return Promise.reject(null);
		}

		const queue = await music.getQueue(guild.id);

		const index = (args.length && !isNaN(parseInt(args[0], 10))) ? args[0] : 1;

		try {
			const result = queue.remove(index);

			if (!result) {
				return this.sendMessage(message.channel, `Nothing to remove.`);
			}

			return this.sendMessage(message.channel, `Removed ${result.title}`);
		} catch (err) {
			this.logger.error(err);
		}
	}

	public async clear({ message }: CommandData): Promise<{}> {
		const music = this.dyno.modules.get('Music');
		const guild = (<eris.GuildChannel>message.channel).guild;

		if (!music.canCommand(message, true)) {
			return Promise.reject(null);
		}

		const queue = await music.getQueue(guild.id);

		queue.clear(guild.id);
		return this.sendMessage(message.channel, 'The queue was cleared.');
	}

	public async shuffle({ message }: CommandData): Promise<{}> {
		const music = this.dyno.modules.get('Music');
		if (!music.canCommand(message, true)) {
			return Promise.reject(null);
		}

		const queue = await music.getQueue((<eris.GuildChannel>message.channel).guild.id);
		await queue.shuffle();

		return this.list({ message });
	}

	public async save({ message, args, guildConfig }: CommandData): Promise<{}> {
		const music = this.dyno.modules.get('Music');
		const guild = (<eris.GuildChannel>message.channel).guild;

		if (!music.canCommand(message, true)) {
			return Promise.reject(null);
		}

		if (!guildConfig.isPremium) {
			return this.sendMessage(message.channel,
				`This feature is available in premium, see <${this.config.site.host}/upgrade> for details.`, { deleteAfter: 30000 });
		}

		const queue = await music.getQueue(guild.id);

		if (!queue.items || !queue.items.length) {
			return this.error(message.channel, `The queue is empty, please add songs first.`);
		}

		if (!args || !args.length) {
			return this.error(message.channel, `Please provide a queue name. See queue help for more information.`);
		}

		const invalidMatch = args[0].match(/[^a-zA-Z0-9\-_]/);
		if (invalidMatch) {
			return this.error(message.channel, 'Invalid name, please use letters, numbers, and/or `-_`');
		}

		try {
			const [doc, count] = await Promise.all([
				this.models.SavedQueue.findOne({ guild: guild.id, name: args[0] }).lean().exec(),
				this.models.SavedQueue.count({ guild: guild.id }),
			]);

			if (doc) {
				return this.error(message.channel, `A queue already exists with that name.`);
			}

			if (count > 50) {
				return this.error(message.channel, `You've reached the maximum number of saved queues, please delete one first.`);
			}

			await queue.saveAs(args[0], message.author);
			return this.success(message.channel, `Saved the queue ${args[0]}`);
		} catch (err) {
			this.logger.error(err);
			return this.error(message.channel, 'Something went wrong trying to save the queue, please try again or contact support.');
		}
	}

	public async delete({ message, args }: CommandData): Promise<{}> {
		const music = this.dyno.modules.get('Music');
		const guild = (<eris.GuildChannel>message.channel).guild;

		if (!music.canCommand(message, true)) {
			return Promise.reject(null);
		}

		const queue = await music.getQueue(guild.id);

		if (!args || !args.length) {
			return this.error(message.channel, `Please provide a queue name. See queue help for more information.`);
		}

		try {
			const result = await this.models.SavedQueue.findOne({
				guild: guild.id,
				name: args[0],
			}).lean().exec();

			if (!result) {
				return this.error(message.channel, `I couldn't find a saved queue by that name.`);
			}

			await queue.delete(args[0]);
			return this.success(message.channel, `Deleted the saved queue ${args[0]}.`);
		} catch (err) {
			this.logger.error(err);
			return this.error(message.channel, 'Something went wrong trying to delete the queue, please try again or contact support.');
		}
	}

	public async load({ message, args }: CommandData): Promise<{}> {
		const music = this.dyno.modules.get('Music');
		const guild = (<eris.GuildChannel>message.channel).guild;

		if (!music.canCommand(message, true)) {
			return Promise.reject(null);
		}

		const queue = await music.getQueue(guild.id);

		if (!args || !args.length) {
			return this.error(message.channel, `Please provide a queue name. See queue help for more information.`);
		}

		try {
			const result = await this.models.SavedQueue.findOne({
				guild: guild.id,
				name: args[0],
			}).lean().exec();

			if (!result) {
				return this.error(message.channel, `I couldn't find a saved queue by that name.`);
			}

			const items = await queue.load(args[0]);

			if (!items || !items.length) {
				return this.error(message.channel, `No items in queue.`);
			}

			return this.success(message.channel, `Loaded queue ${args[0]}.`);
		} catch (err) {
			this.logger(err);
			return this.error(message.channel, 'Something went wrong trying to load the queue, please try again or contact support.');
		}
	}

	public async saved({ message, args }: CommandData): Promise<{}> {
		try {
			const docs = await this.models.SavedQueue.find({ guild: (<eris.GuildChannel>message.channel).guild.id }).lean().exec();

			if (!docs || !docs.length) {
				return this.sendMessage(message.channel, `You don't have any saved queues.`);
			}

			const embed = {
				color: this.utils.getColor('blue'),
				title: 'Saved Queues',
				fields: [],
				timestamp: (new Date()).toISOString(),
			};

			for (const index in docs) {
				let idx = parseInt(index, 10);
				const doc = docs[idx];
				embed.fields.push({ name: `${++idx}. ${doc.name}`, value: `${doc.queue.length} songs`, inline: true });
			}

			return this.sendMessage(message.channel, { embed });
		} catch (err) {
			this.logger.error(err);
			return this.error(message.channel, 'Something went wrong getting saved queues. Please try again or contact support.');
		}
	}
}

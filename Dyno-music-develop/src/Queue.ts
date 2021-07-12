import {Base} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as dyno from 'Dyno';
import * as Joi from 'joi';

/**
 * Music queue
 * @class Queue
 */
export default class Queue extends Base {
	public guildId: string;
	public items: QueueItems;
	public itemSchema: any = Joi.object().keys({
		track: Joi.string().required(),
		identifier: Joi.string().required(),
		title: Joi.string().required(),
		length: Joi.number().required(),
		uri: Joi.string().required(),
		v: Joi.number().required(),
	}).unknown(true);

	constructor(dynoInstance: dyno.Dyno, guild: eris.Guild) {
		super(dynoInstance, guild);

		this.guildId = guild.id;
		this.items = [];
	}

	public get length(): number {
		return this.items.length;
	}

	public get size(): number {
		return this.items.length;
	}

	public async getQueue(): Promise<QueueItems> {
		if (this.items != undefined && this.items.length > 0) {
			return this.items;
		}

		let doc;

		try {
			doc = await this.models.Queue.findOne({ guild: this.guildId }).lean().exec();
		} catch (err) {
			this.logger.error(err, { type: 'queue.fetch', guild: this.guildId });
			return null;
		}

		if (doc != undefined && doc.queue != undefined && doc.queue.length > 0) {
			this.items = doc.queue;
			return doc.queue;
		} else {
			this.items = [];
			return this.items;
		}
	}

	public async save(): Promise<boolean> {
		try {
			await this.models.Queue.update({ guild: this.guildId }, { $set: { guild: this.guildId, queue: this.items } }, { upsert: true });

			return true;
		} catch (err) {
			this.logger.error(err, { type: 'queue.save', guild: this.guildId });
			return false;
		}
	}

	public async saveAs(name: string, user: eris.User): Promise<void> {
		try {
			const doc = new this.models.SavedQueue({
				guild: this.guildId,
				name: name,
				queue: this.items,
				creator: {
					id: user.id,
					username: user.username,
					discriminator: user.discriminator,
				},
			});
			await doc.save();
		} catch (err) {
			throw err;
		}
	}

	public async load(name: string): Promise<QueueItems> {
		let doc;
		try {
			doc = await this.models.SavedQueue.findOne({ guild: this.guildId, name: name }).lean().exec();
		} catch (err) {
			throw err;
		}

		if (doc != undefined && doc.queue !== undefined && doc.queue.length > 0) {
			this.items = doc.queue;
			this.save().catch(() => null);

			return this.items;
		} else {
			return null;
		}
	}

	public async delete(name: string): Promise<true> {
		try {
			await this.models.SavedQueue.remove({ guild: this.guildId, name: name });

			return true;
		} catch (err) {
			throw err;
		}
	}

	public isEmpty(): boolean {
		return this.items == undefined || this.items.length === 0;
	}

	public async shift(forceRemove?: boolean): Promise<QueueItems> {
		if (this.items.length === 0) {
			return;
		}

		let guildConfig;

		try {
			guildConfig = await this.dyno.guilds.getOrFetch(this.guildId);
		} catch (err) {
			this.logger.error(err);
			return;
		}

		const activeItem = this.items.shift();

		if (forceRemove !== true && guildConfig.music != undefined && guildConfig.music.repeat === true) {
			this.items.push(activeItem);
		}

		try {
			await this.save();
		} catch (err) {
			this.logger.error(err);
		}

		return this.items;
	}

	public async add(item: QueueItem, prepend: boolean): Promise<QueueItems> {
		const items = this.items.length > 0 ? this.items : [];
		const index = this.items.findIndex((i: QueueItem) =>
			i.identifier === item.identifier || i.video_id === item.identifier);

		const test = Joi.validate(item, this.itemSchema);

		if (test.error) {
			throw test.error;
		}

		if (index > -1) {
			const indexedItem = items.splice(index, 1)[0];
			items.splice(1, 0, indexedItem);
		} else if (prepend === true) {
			items.unshift(item);
		} else {
			items.push(item);
		}

		this.items = items;
		this.save().catch(() => null);

		return this.items;
	}

	public async bulkAdd(items: QueueItem[]): Promise<QueueItems> {
		items = items.filter((i: QueueItem) => {
			const item = this.items.find((o: QueueItem) => o.identifier === i.identifier || o.video_id === i.identifier);
			return item == undefined;
		});

		const array = Joi.array().items(this.itemSchema);
		const test = array.validate(items);

		if (test.error) {
			throw test.error;
		}

		this.items = this.items.concat(items);
		this.save().catch(() => null);

		return items.length > 0 ? items : [];
	}

	public async replace(index: number, item: QueueItem): Promise<QueueItems> {
		const test = Joi.validate(item, this.itemSchema);

		if (test.error) {
			throw test.error;
		}

		this.items[index] = item;
		this.save().catch(() => null);

		return this.items;
	}

	public remove(index?: number): QueueItem {
		if (this.items == undefined || this.items.length === 0) {
			return;
		}

		const queueIndex = index != undefined ? index - 1 : 0;
		let result;

		// remove the first song if there's no index
		if (index == undefined) {
			result = this.items.shift();
		} else {
			result = this.items.splice(queueIndex, 1).shift();
		}

		this.save().catch(() => null);

		return result;
	}

	public clear(): Promise<any> {
		this.items = [];

		return this.save();
	}

	public async shuffle(): Promise<QueueItems> {
		if (this.items == undefined || this.items.length === 0) {
			return null;
		}

		this.items = this.utils.shuffleArray(this.items);
		try {
			await this.save();
		} catch (err) {
			this.logger.error(err);
		}

		return this.items;
	}
}

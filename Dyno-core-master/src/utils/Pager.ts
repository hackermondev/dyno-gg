import * as eris from '@dyno.gg/eris';
import Base from '../structures/Base';
import Collection from './Collection';

/**
 * @class Pager
 * @extends Base
 */
export default class Pager extends Base {
	public id: string;
	public channelId: string;
	public pagers: Collection;
	public userId: string;
	public message: eris.Message;
	public messageId: string = null;
	public createdAt: number = null;
	public embed: eris.Embed;
	public fields: any[] = null;
	public page: number = 1;
	public pageLimit: number;
	public lastPage: number;
	public emojiValues: any[];
	public pageListener: Function = null;
	public pagerEmojis: any = {
		arrow_left: '\U2B05',
		arrow_right: '\U27A1',
		rewind: '\U23EA',
		fast_forward: '\U23E9',
	};

	/**
	 * Pager constructor
	 * @param {PagerManager} 		pagers Reference to the pagers collection
	 * @param {String} 				id Pager ID
	 * @param {Object} 				options Pager options
	 * @param {String|GuildChannel} options.channel The channel this pager will be created in
	 * @param {User|Member} 		options.user The user this pager is created for
	 * @param {Object} 				options.embed The embed object to be sent without fields
	 * @param {Object[]} 			options.fields All embed fields that will be paged
	 * @param {Number} 				[options.pageLimit=10] The number of items per page, max 25, default 10
	 */
	constructor(dyno: any, pagers: Collection, id: string, options: any) {
		super(dyno);

		this.id = id;
		this.channelId = typeof options.channel === 'string' ? options.channel : options.channel.id;
		this.pagers = pagers;
		this.userId = options.user.id;
		this.embed = options.embed || null;
		this.fields = options.fields || null;
		this.pageLimit = options.pageLimit || 10;
		this.lastPage = Math.ceil(this.fields.length / this.pageLimit);

		this.pagerEmojis = {
			arrow_left: '⬅',
			arrow_right: '➡',
			// arrow_right: '➡',
			rewind: '⏪',
			fast_forward: '⏩',
		};

		this.emojiValues = Object.values(this.pagerEmojis);

		setTimeout(this.destroy.bind(this), 90000);
	}

	/**
	 * Create the paged message
	 */
	public async createMessage() {
		if (!this.embed || !this.fields || !this.fields.length) {
			return Promise.reject('Not enough data to create a pager.');
		}

		try {
			await this.paginate();
		} catch (err) {
			throw err;
		}

		if (this.fields.length <= this.pageLimit) {
			return this.pagers.delete(this.id);
		}

		await this.createReactions();
		this.pageListener = this.client.on('messageReactionAdd', this.messageReactionAdd.bind(this));
	}

	/**
	 * Message Reaction Add handler
	 * @param {Message} message Eris message
	 * @param {String} emoji Unicode emoji
	 * @param {String} userId User ID
	 */
	public messageReactionAdd(message: eris.Message, emoji: eris.EmojiBase, userId: string ) {
		if (userId === this.client.user.id) { return; }
		if (userId !== this.userId || message.channel.id !== this.channelId) { return; }
		if (!emoji.name || !this.emojiValues.includes(emoji.name)) { return; }
		switch (emoji.name) {
			case this.pagerEmojis.arrow_left: {
				this.pageLeft().catch(() => null);
				this.removeReaction(this.pagerEmojis.arrow_left);
				break;
			}
			case this.pagerEmojis.arrow_right: {
				this.pageRight().catch(() => null);
				this.removeReaction(this.pagerEmojis.arrow_right);
				break;
			}
			case this.pagerEmojis.rewind: {
				this.pageFirst().catch(() => null);
				this.removeReaction(this.pagerEmojis.rewind);
				break;
			}
			case this.pagerEmojis.fast_forward: {
				this.pageLast().catch(() => null);
				this.removeReaction(this.pagerEmojis.fast_forward);
				break;
			}
			default:
				break;
		}
	}

	/**
	 * Paginate the embed
	 */
	public async paginate() {
		const start = ((this.page - 1) * this.pageLimit);

		const _embed = Object.assign({}, this.embed, {
			title: this.embed.title.replace('%%page%%', this.page.toString()),
			fields: this.fields.slice(start, start + this.pageLimit),
		});

		if (!this.messageId) {
			try {
				const message = await this.client.createMessage(this.channelId, { embed: _embed });

				if (!message) {
					return Promise.reject('Unable to create message.');
				}

				this.messageId = message.id;
				// this.userId = message.author.id;
			} catch (err) {
				return Promise.reject('Unable to create message.');
			}
		} else {
			this.client.editMessage(this.channelId, this.messageId, { embed: _embed });
		}
	}

	/**
	 * Page left
	 */
	public pageLeft() {
		if (this.page <= 1) {
			return;
		}
		this.page--;
		return this.paginate();
	}

	/**
	 * Page right
	 */
	public pageRight() {
		if (this.page >= this.lastPage) {
			return;
		}
		this.page++;
		return this.paginate();
	}

	/**
	 * Page to the first page
	 */
	public pageFirst() {
		this.page = 1;
		return this.paginate();
	}

	/**
	 * Page to the last page
	 */
	public pageLast() {
		this.page = this.lastPage;
		return this.paginate();
	}

	/**
	 * Destroy the pager
	 */
	public destroy() {
		this.client.removeMessageReactions(this.channelId, this.messageId);
		if (this.pageListener) {
			this.client.removeListener('messageReactionAdd', this.pageListener);
		}
		this.pagers.delete(this.id);
	}

	/**
	 * Create a reaction
	 * @param {Object} emoji Emoji object
	 */
	private async createReaction(emoji: eris.EmojiBase) {
		return this.client.addMessageReaction(this.channelId, this.messageId, emoji).catch(() => null);
	}

	/**
	 * Create the pager reactions
	 */
	private async createReactions() {
		try {
			if (this.page === 1) {
				return Promise.all([
					this.createReaction(this.pagerEmojis.arrow_left),
					this.createReaction(this.pagerEmojis.arrow_right),
				]).catch(() => null);
			} else if (this.page === this.lastPage) {
				return Promise.all([
					this.createReaction(this.pagerEmojis.arrow_left),
					this.createReaction(this.pagerEmojis.arrow_right),
				]).catch(() => null);
			} else {
				return Promise.all([
					this.createReaction(this.pagerEmojis.arrow_left),
					this.createReaction(this.pagerEmojis.arrow_right),
				]).catch(() => null);
			}
		} catch (err) {
			// pass
		}
	}

	/**
	 * Remove a single reaction
	 * @param {String} emoji Unicode emoji string
	 */
	private removeReaction(emoji: eris.EmojiBase) {
		this.client.removeMessageReaction(this.channelId, this.messageId, emoji, this.userId).catch(() => null);
	}
}

'use strict';

const YouTube = require('youtube-node');
const Base = Loader.require('./core/structures/Base');
const utils = Loader.require('./core/utils');
const redis = require('../../core/redis');

const yt = Promise.promisifyAll(new YouTube());

/**
 * @class Search
 * @extends Module
 */
class Search extends Base {

	/**
	 * Youtube searcher
	 * @param {Object} config Bot configuration
	 * @param {...*} [args] Additonal arguments
	 */
	constructor() {
		super();

		this.searches = {};
		this.version = 3.1;

		if (!this.config.youtubeKey) throw new Error('Youtube API Key Required. Set `youtubeKey` in config');
		yt.setKey(this.config.youtubeKey);
	}

	clearCache() {
		for (const i in this.searches) {
			const search = this.searches[i];
			if (search.time < Date.now() - 300) continue;
			delete this.searches[i];
		}
	}

	/**
	 * Cache search results
	 * @param {String} key Key to cache by
	 * @param {String} query The search query
	 * @param {Object} result Youtube API response object
	 */
	async cacheSearch(id, result) {
		const search = {
			cursor: 0,
			items: this.parseItems(result),
			time: Date.now(),
		};

		this.searches[id] = search;
	}

	/**
	 * Parse items from youtube response
	 * @param  {Object} result Youtube API response Object
	 * @return {Array}
	 */
	parseItems(result) {
		return result.items.filter(i => i.snippet && i.snippet.title).map(item => {
			// normalize item type
			let type = item.id ? item.id.kind || item.kind : item.kind,
				id = (item.id && typeof item.id === 'object') ? item.id.videoId || item.id.playlistId :
					(item.contentDetails) ? item.contentDetails.videoId : null;

			type = type.replace('youtube#', '');

			let url = type === 'video' ? `https://www.youtube.com/watch?v=${id}` :
					`https://www.youtube.com/playlist?list=${id}`,
				thumbnail_url = item.snippet.thumbnails ? item.snippet.thumbnails.default.url : '';

			return {
				video_id: id,
				type: type,
				title: item.snippet.title,
				thumbnail_url: thumbnail_url,
				url: url,
				v: 2,
			};
		});
	}

	/**
	 * Search the youtube api, returned cached results for repeated searches
	 * @param {Object} msg discord.js message resolvable
	 * @param {String} [type='video']  Youtube search api type
	 * @param {String} query String to search the youtube api
	 * @param {Number} limit Number of results to return
	 * @return {Promise}
	 */
	async search(msg, type = 'video', query, limit = 10) {
		if (arguments.length < 3) return Promise.reject('Not enough arguments given.');

		// normalize search queries
		query = query.replace(/[^\w\s]/gi, '').toLowerCase();

		const id = `${msg.channel.id}${msg.author.id}`;
		const queryKey = `music.search.v${this.version}.${utils.sha256(query)}`;

		// query the cache
		try {
			let result = await redis.getAsync(queryKey);

			if (result && result.length) {
				result = JSON.parse(result);

				this.cacheSearch(id, result);

				redis.hincrby('music.search.counts', 'cache', 1);
				this.debug(`Youtube search '${query}' returned from cache`);

				return Promise.resolve(this.get(msg));
			}
		} catch (err) {
			this.logger.error(err, {
				type: 'queue.search.cache',
				guild: msg.channel.guild.id,
				shard: msg.channel.guild.shard.id,
				query: query,
			});
			return Promise.reject(err);
		}

		// add type param
		yt.addParam('type', type);

		// query the api
		try {
			const result = await yt.searchAsync(query, limit);
			if (!result || !result.items) return Promise.resolve();

			await this.cacheSearch(id, result);

			redis.multi()
				.setex(queryKey, 259200, JSON.stringify(result))
				.hincrby('music.search.counts', 'api', 1)
				.exec();

			this.debug(`Youtube search '${query}' returned from api`);

			return Promise.resolve(this.get(msg));
		} catch (err) {
			this.logger.error(err, {
				type: 'queue.search.api',
				guild: msg.channel.guild.id,
				shard: msg.channel.guild.shard.id,
				query: query,
			});
			return Promise.reject(err);
		}
	}

	/**
	 * Get items from a youtube playlist by id
	 * @param {Object} msg discord.js message resolvable
	 * @param {String} id Youtube playlist id
	 * @return {Promise} Resolves the list of items in a playlist
	 */
	async playlist(msg, id) {
		if (arguments.length < 2) return Promise.reject('Not enough arguments given.');

		yt.addParam('maxResults', '50');

		try {
			const result = await yt.getPlayListsItemsByIdAsync(id);
			if (!result || !result.length) return Promise.resolve();
			return Promise.resolve(this.parseItems(result));
		} catch (err) {
			return Promise.reject(err);
		}
	}

	/**
	 * Get a search result
	 * @param  {Object} msg discord.js message resolvable
	 * @param  {String} [prevNext]  prev or next
	 * @return {Object} Returns an item from search results
	 */
	get(msg, prevNext) {
		const id = `${msg.channel.id}${msg.author.id}`;
		const search = this.searches[id];

		if (!search) return false;

		if (prevNext === 'next') {
			if (!search.items[search.cursor + 1]) return false;
			search.cursor++;
		}

		if (prevNext === 'prev') {
			if (!search.items[search.cursor - 1]) return false;
			search.cursor--;
		}

		return search.items[search.cursor];
	}

	/**
	 * Get next search result
	 * @param  {Object}   msg discord.js message resolvable
	 * @return {Object}       Returns an item from search results
	 */
	next(msg) {
		return this.get(msg, 'next');
	}

	/**
	 * Get previous search result
	 * @param  {Object} msg discord.js message resolvable
	 * @return {Object}     Returns an item from search results
	 */
	prev(msg) {
		return this.get(msg, 'prev');
	}
}

module.exports = Search;

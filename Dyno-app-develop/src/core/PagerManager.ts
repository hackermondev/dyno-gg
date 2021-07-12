import {Collection, Pager} from '@dyno.gg/dyno-core';

/**
 * @class PagerManager
 * @extends Collection
 */
export default class PagerManager extends Collection {
	private dyno: Dyno;

	/**
	 * PagerManager constructor
	 * @param {Dyno} dyno Dyno core instance
	 */
	constructor(dyno: Dyno) {
		super();
		this.dyno = dyno;
	}

	/**
	 * Create a pager
	 * @param {Object} 				options Pager options
	 * @param {String|GuildChannel} options.channel The channel this pager will be created in
	 * @param {User|Member} 		options.user The user this pager is created for
	 * @param {Object} 				options.embed The embed object to be sent without fields
	 * @param {Object[]} 			options.fields All embed fields that will be paged
	 * @param {Number} 				[options.pageLimit=10] The number of items per page, max 25, default 10
	 */
	public create(options: any) {
		if (!options || !options.channel || !options.user) { return; }
		const id = `${options.channel.id}.${options.user.id}`;
		const pager = new Pager(this.dyno, this, id, options);
		this.set(id, pager);
		return pager;
	}
}

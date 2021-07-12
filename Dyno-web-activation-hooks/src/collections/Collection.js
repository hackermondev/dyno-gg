'use strict';

/**
 * Generic collection class that extends Map and provides array methods
 * @abstract Collection
 * @extends Map
 */
class Collection extends Map {
	/**
	 * Convert Map to array
	 * @returns {Array} Array of mapped values
	 */
	toArray() {
		return [...this.values()];
	}

	/**
	 * Filter values by function
	 * @param {...*} args Arguments to pass to filter
	 * @returns {Array.<*>}
	 */
	filter(...args) {
		return this.toArray().filter(...args);
	}

	/**
	 * Map values by function
	 * @param {...*} args Arguments to pass to map
	 * @returns {Array}
	 */
	map(...args) {
		return this.toArray().map(...args);
	}

	/**
	 * Reduce values by function
	 * @param {...*} args Arguments to pass to reduce
	 * @returns {Array}
	 */
	reduce(...args) {
		return this.toArray().reduce(...args);
	}

	/**
	 * Find values by function
	 * @param {...*} args Arguments to pass to map
	 * @returns {Array}
	 */
	find(...args) {
		return this.toArray().find(...args);
	}

	/**
	 * Pluck values of key from collection
	 * @param  {String} key the key to match
	 * @returns {Array}     array of key values
	 */
	pluck(key) {
		return this.toArray().reduce((i, o) => {
			if (!o[key]) return i;
			i.push(o[key]);
			return i;
		}, []);
	}

	/**
	 * Group collection by key
	 * @param  {String} key Key to group by
	 * @returns {Object}     Object indexed by key value
	 */
	groupBy(key) {
		return this.toArray().reduce((i, o) => {
			let val = o[key];
			i[val] = i[val] || [];
			i[val].push(o);
			return i;
		}, {});
	}
}

module.exports = Collection;

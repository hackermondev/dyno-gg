'use strict';

const EventEmitter = require('eventemitter3');
const Collection = require('./Collection');

const collection = Symbol('collection');

/**
 * @abstract EventCollection
 * @extends EventEmitter
 */
class EventCollection extends EventEmitter {
	constructor() {
		super();
		this[collection] = new Collection();
	}

	get size() {
		return this[collection].size;
	}

	get length() {
		return this[collection].size;
	}

	has(key) {
		return this[collection].has(key);
	}

	get(key) {
		return this[collection].get(key);
	}

	set(key, value) {
		return this[collection].set(key, value);
	}

	delete(key) {
		return this[collection].delete(key);
	}

	keys() {
		return this[collection].keys();
	}

	values() {
		return this[collection].values();
	}

	entries() {
		return this[collection].entries();
	}

	forEach(...args) {
		return this[collection].forEach(...args);
	}

	filter(...args) {
		return this[collection].filter(...args);
	}

	map(...args) {
		return this[collection].map(...args);
	}

	reduce(...args) {
		return this[collection].reduce(...args);
	}

	find(...args) {
		return this[collection].find(...args);
	}

	pluck(...args) {
		return this[collection].pluck(...args);
	}

	groupBy(...args) {
		return this[collection].groupBy(...args);
	}


}

module.exports = EventCollection;

'use strict';

import { EventEmitter } from 'events';
import Collection from './Collection';

const collection = Symbol('collection');

export default class EventCollection extends EventEmitter {
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

	public has(key: any) {
		return this[collection].has(key);
	}

	public get(key: any) {
		return this[collection].get(key);
	}

	public set(key: any, value: any) {
		return this[collection].set(key, value);
	}

	public delete(key: any) {
		return this[collection].delete(key);
	}

	public keys() {
		return this[collection].keys();
	}

	public values() {
		return this[collection].values();
	}

	public entries() {
		return this[collection].entries();
	}

	public forEach(...args: any[]) {
		return this[collection].forEach(...args);
	}

	public filter(...args: any[]) {
		return this[collection].filter(...args);
	}

	public map(...args: any[]) {
		return this[collection].map(...args);
	}

	public reduce(...args: any[]) {
		return this[collection].reduce(...args);
	}

	public find(...args: any[]) {
		return this[collection].find(...args);
	}
}

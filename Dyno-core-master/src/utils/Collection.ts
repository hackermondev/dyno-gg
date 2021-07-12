/**
 * Generic collection class that extends Map and provides array methods
 * @abstract Collection
 * @extends Map
 */
export default class Collection extends Map {
	/**
	 * Convert Map to array
	 */
	public toArray() {
		return [...this.values()];
	}

	/**
	 * Filter values by function
	 */
	public filter(callbackFn: any, thisArg?: any) {
		return this.toArray().filter(callbackFn, thisArg);
	}

	/**
	 * Map values by function
	 */
	public map(callbackFn: any, thisArg?: any) {
		return this.toArray().map(callbackFn, thisArg);
	}

	/**
	 * Reduce values by function
	 */
	public reduce(callbackFn: any, currentIndex: number) {
		return this.toArray().reduce(callbackFn, currentIndex);
	}

	/**
	 * Find values by function
	 */
	public find(predicate: any, thisArg: any) {
		return this.toArray().find(predicate, thisArg);
	}
}

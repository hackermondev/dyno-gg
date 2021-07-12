/**
 * Generic queue class
 */
export default class Queue extends Array {
	public rate: number = 250;
	public limit: number = 1;
	private queue: Function[];
	private fn: Function;

	constructor(rate?: number, limit?: number, fn?: Function) {
		super();

		if (fn != undefined) {
			this.fn = fn;
		}

		if (rate != undefined) {
			this.rate = rate;
		}

		if (limit != undefined) {
			this.limit = limit;
		}
	}

	/**
	 * Check the failover queue
	 */
	public check() {
		if (this.length > 0) {
			const fns = this.splice(0, this.limit);
			for (const fn of fns) {
				this.process(fn);
			}
		}
	}

	/**
	 * Queue a failover
	 * @param fn The failover function to queue
	 */
	public add(fn: Function) {
		if (this.length > 0) {
			this.push(fn);
		} else {
			this.process(fn);
		}
	}

	/**
	 * Process the failover queue
	 * @param fn The failover function to call
	 */
	public process(fn: Function) {
		fn();
		setTimeout(this.check.bind(this), this.rate);
	}
}

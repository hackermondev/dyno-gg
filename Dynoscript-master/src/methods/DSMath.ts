/**
 * Dynoscript Math class extends javascript Math
 * @class DSMath
 */
class DSMath {
	constructor() {
		for (const attr of Object.getOwnPropertyNames(Math)) {
			if (typeof Math[attr] !== 'function') {
				this[attr] = Math[attr];
			} else {
				Object.defineProperty(this, attr, {
					value: (env: IEnvironment, ...args: any[]) => Math[attr](...args),
					writable: false,
					configurable: false,
					enumerable: true,
				});
			}
		}
	}

	public static get isClass(): boolean {
		return true;
	}

	public static get className(): string {
		return 'math';
	}
}

export = DSMath;

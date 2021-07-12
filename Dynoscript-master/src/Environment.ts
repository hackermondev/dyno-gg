/**
 * Dynoscript interpreter environment
 * @class Environment
 * @implements IEnvironment
 */
export class Environment implements IEnvironment {
	public methods: {[key: string]: any};
	public parent: IEnvironment | undefined;
	public vars: {[key: string]: any};

	constructor(parent?: IEnvironment) {
		this.methods = {};
		this.parent = parent;
		this.vars = {};
	}

	public extend(): IEnvironment {
		return new Environment(this);
	}

	public lookup(name: string): IEnvironment|false {
		let scope: IEnvironment = this;
		while (scope !== undefined) {
			if (Object.prototype.hasOwnProperty.call(scope.vars, name)) {
				return scope;
			}
			scope = scope.parent;
		}

		return false;
	}

	public hasVar(name: string): boolean {
		let scope: IEnvironment = this;
		while (scope !== undefined) {
			if (Object.prototype.hasOwnProperty.call(scope.vars, name)) {
				return true;
			}
			scope = scope.parent;
		}

		return false;
	}

	public getVar(name: string): any {
		if (this.vars[name]) {
			return this.vars[name];
		}

		if (this.parent !== undefined) {
			const val = this.parent.getVar(name);
			if (val) {
				return val;
			}
		}

		throw new Error(`Undefined variable ${name}`);
	}

	public setVar(name: string, value: any): void {
		let scope = this.lookup(name);
		scope = scope !== false ? scope : this;
		scope.vars[name] = value;
	}

	public defVar(name: string, value: any): void {
		this.vars[name] = value;
	}

	public hasMethod(name: string): boolean {
		let scope: IEnvironment = this;
		while (scope !== undefined) {
			if (Object.prototype.hasOwnProperty.call(scope.methods, name)) {
				return true;
			}
			scope = scope.parent;
		}

		return false;
	}
	public getMethod(name: string): Function {
		if (this.methods[name] !== undefined) {
			return this.methods[name];
		}
		if (this.parent !== undefined) {
			const fn = this.parent.getMethod(name);
			if (fn) {
				return fn;
			}
		}

		throw new Error(`Undefined method ${name}`);
	}

	public defMethod(name: string, value: any): void {
		this.methods[name] = value;
	}
}

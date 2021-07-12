import * as chalk from 'chalk';
import * as path from 'path';
import * as cli from 'pixl-cli';
import * as util from 'util';

const Parser = require(path.join(__dirname, '../build/Parser.js'));

/**
 * Dynoscript Parse Error
 * @class ParseError
 * @extends Error
 */
class ParseError extends Error {
	public name: string = 'ParseError';
	public extra: UnknownObject;
	public message: string;
	public stack: string;

	constructor(message: string, extra?: UnknownObject) {
		super(message);
		this.extra = null;

		const error = extra.error;

		if (extra !== undefined && extra.message !== undefined && extra.hasOwnProperty('program')) {
			const programLines : string[] = extra.program.split('\n');
			const lineStart    : number   = error.location.start.line;
			const lineEnd      : number   = error.location.end.line;
			const lineCount    : number   = lineEnd - lineStart;
			const errLines     : string[] = programLines.splice(lineStart - 1, lineCount + 1);
			const index        : number   = error.location.start.column - 1;
			const char         : string   = errLines[0].split('')[error.location.start.column - 1];

			errLines[0] = errLines[0].substr(0, index) + chalk.green(char) + errLines[0].substr(index + 1);
			this.message = `Unexpected '${error.found}' on line:${error.location.start.line} col:${error.location.start.column}\n${errLines}`;
		} else {
			if (error) {
				this.message = error.message !== undefined ? error.message : 'Unknown error';
			} else {
				this.message = 'Unknown error';
			}
		}
		Error.captureStackTrace(this, this.constructor);
	}

	public inspect() {
		return this.stack;
	}
}

/**
 * Dynoscript Interpreter
 * @class Interpreter
 * @implements IInterpreter
 */
export class Interpreter implements IInterpreter {
	public env: IEnvironment;

	constructor(env: IEnvironment, data: {[key: string]: any}) {
		this.env = env;
		if (data !== undefined) {
			for (const key of Object.keys(data)) {
				if (data[key] !== undefined) {
					this.env.setVar(key, data[key]);
				}
			}
		}
	}

	public async execute(program: string, isCLI?: boolean): Promise<boolean> {
		if (isCLI) {
			process.stdout.write(chalk.blue('\nExecuting Dynoscript...\n'));
			const linedProgram = cli.box(
				program.split('\n').map((line: string, index: number) => `${index + 1}. ${line}`).join('\n'),
				{ indent: 1, hspace: 2, vspace: 1, styles: ['white'] },
			);
			process.stdout.write(`${chalk.blue(' Script:\n')}${linedProgram}\n`);
		}

		let result;

		try {
			result = Parser.parse(program);
		} catch (err) {
			let message = null;
			if (err.found) {
				message = new ParseError(err.message, {error: err, program});
			}

			throw message || err.message || err;
		}

		if (!result) {
			throw new ParseError('The program returned with an empty result.');
		}

		if (isCLI) {
			const linedAST = cli.box(
				util.inspect(result, { depth: 9 }),
				{ indent: 1, hspace: 2, vspace: 1, styles: ['green'] },
			);

			process.stdout.write(`${chalk.blue(' AST:')} \n${linedAST}`);
			process.stdout.write(`\n${chalk.blue('Result:')}`);
		}

		try {
			await this.evaluate(result, this.env);

			return true;
		} catch (err) {
			throw err;
		}
	}

	public async evaluate(exp: IExpression, env: IEnvironment): Promise<any> {
		if (Array.isArray(exp)) {
			let result = null;
			for (const stmt of exp) {
				try {
					result = await this.evaluate(stmt, env);
					if (typeof result === 'object' && result.action) {
						if (['return', 'break'].includes(result.action)) {
							return result;
						}
					}
				} catch (err) {
					throw err;
				}
			}

			return result;
		}

		const expType = exp.type.charAt(0).toLowerCase() + exp.type.substr(1);

		if (this[expType]) {
			return this[expType](exp, env);
		} else {
			throw new Error(`Unexpected type: ${exp.type}`);
		}
	}

	protected boolean(exp: IExpression): boolean {
		return exp.value === 'true';
	}

	protected number(exp: IExpression): number {
		return parseInt(exp.value, 10);
	}

	protected float(exp: IExpression): number {
		return parseFloat(exp.value);
	}

	protected string(exp: IExpression, env: IEnvironment): string {
		exp.value = exp.value.replace(
			/\{\$([a-zA-Z0-9\.\-\_]+)\}/gi,
			(match: string, name: string) => {
				const value = this.getNestedProp(env.vars, name, null, env);

				return value !== undefined ? value : name;
			});

		return exp.value;
	}

	protected variable(exp: IExpression, env: IEnvironment): any {
		return this.getNestedProp(env.vars, exp.value, null, env);
	}

	protected async program(exp: IExpression, env: IEnvironment): Promise<any> {
		let result = null;
		for (const stmt of exp.body) {
			try {
				result = await this.evaluate(stmt, env);
				if (result && typeof result === 'object' && result.action && result.action === 'return') {
					return result;
				}
			} catch (err) {
				throw err;
			}
		}

		return result;
	}

	protected async object(exp: IExpression, env: IEnvironment): Promise<object> {
		const object = {};
		for (const key of Object.keys(exp.value)) {
			try {
				object[key] = await this.evaluate(exp.value[key], env);
			} catch (err) {
				throw err;
			}
		}

		return object;
	}

	protected async array(exp: IExpression, env: IEnvironment): Promise<any[]> {
		const array = [];
		for (const value of exp.value) {
			try {
				const res = await this.evaluate(value, env);
				array.push(res);
			} catch (err) {
				throw err;
			}
		}

		return array;
	}

	protected tuple(exp: IExpression, env: IEnvironment): Promise<any[]> {
		return this.array(exp, env);
	}

	protected async assignmentExpression(exp: IExpression, env: IEnvironment): Promise<void> {
		try {
			const value = await this.evaluate(exp.value, env);

			return env.defVar(exp.id, value);
		} catch (err) {
			throw err;
		}
	}

	protected async binaryExpression(exp: IExpression, env: IEnvironment): Promise<any> {
		try {
			let left = exp.left;
			let right = exp.right;

			if (typeof left === 'object') {
				left = await this.evaluate(exp.left, env);
			}
			if (typeof right === 'object') {
				right = await this.evaluate(exp.right, env);
			}

			return this.applyOp(exp.operator, left, right);
		} catch (err) {
			throw err;
		}
	}

	protected async conditionalExpression(exp: IExpression, env: IEnvironment): Promise<any> {
		const leftValue = await this.evaluate(exp.left, env);
		const rightValue = await this.evaluate(exp.right, env);

		return this.applyOp(exp.operator, leftValue, rightValue);
	}

	protected async sequenceExpression(exp: IExpression, env: IEnvironment): Promise<any> {
		const conditions = [];

		for (const cond of exp.expressions) {
			const res = await this.evaluate(cond, env);
			conditions.push(res);
		}

		return conditions.reduce((left: any, right: any) => this.applyOp(exp.operator, left, right), conditions[0]);
	}

	protected async ifStatement(exp: IExpression, env: IEnvironment): Promise<any> {
		try {
			const cond = await this.evaluate(exp.test, env);
			if (!exp.negate && cond) {
				return await this.evaluate(exp.consequent, env);
			} else if (exp.negate && !cond) {
				return await this.evaluate(exp.consequent, env);
			}

			return exp.alternate ? await this.evaluate(exp.alternate, env) : false;
		} catch (err) {
			throw err;
		}
	}

	protected async argument(exp: IExpression, env: IEnvironment): Promise<IMethodArgument> {
		try {
			const value = await this.evaluate(exp.value, env);

			return { key: exp.key, value: value };
		} catch (err) {
			throw err;
		}
	}

	protected async method(exp: IExpression, env: IEnvironment): Promise<any> {
		const args = [];
		let result;

		if (exp.name === 'return') {
			return { action: 'return' };
		}

		if (exp.hasOwnProperty('args')) {
			for (const arg of exp.args) {
				const r = await this.evaluate(arg, env);
				args.push(r);
			}
		}
		if (exp.hasOwnProperty('class')) {
			if (!env.hasMethod(exp.class)) {
				throw new Error(`Method ${exp.class} does not exist.`);
			}
			if (!env.getMethod(exp.class).hasOwnProperty(exp.name)) {
				throw new Error(`Method ${exp.class} has no property ${exp.name}.`);
			}

			try {
				const method = env.getMethod(exp.class);
				result = await method[exp.name](env, ...args);
			} catch (err) {
				throw new Error(`Error executing method ${exp.class}.${exp.name}.`);
			}

			return result;
		}

		if (!env.hasMethod(exp.name)) {
			throw new Error(`Method ${exp.name} does not exist.`);
		}

		try {
			const method = env.getMethod(exp.name);
			result = await method(env, ...args);
		} catch (err) {
			console.error(err);
			throw new Error(`Error executing method ${exp.name}.`);
		}

		return result;
	}

	protected closeStatement(): null {
		return null;
	}

	protected breakStatement() {
		return { action: 'break' };
	}

	protected returnStatement() {
		return { action: 'return' };
	}

	private getNestedProp(obj: object, key: string, def: null, env: IEnvironment): any {
		const context = Object.assign({}, obj);
		const result = (key.split != undefined ? key.split('.') : [key]).reduce(
			(o: object, k: string) => {
				let val = o != undefined ? o[k] : null;
				// evaluate variables as properties (feels dirty man)
				if (!val && k.startsWith('$')) {
					const name = k.slice(1);
					if (env.hasVar(name)) {
						const tmp = env.getVar(name);
						val = o != undefined ? o[tmp] : null;
					}
				}

				return val;
			},
			context,
		);

		return result ? result : def;
	}

	private applyOp(op: string, left: any, right: any): any {
		function num(x: number) {
			if (typeof x !== 'number') {
				throw new Error(`Expected number but got ${x}`);
			}

			return x;
		}
		function div(x: number) {
			if (num(x) === 0) {
				throw new Error('Divide by zero');
			}

			return x;
		}

		switch (op) {
			case '+':
				/* tslint:disable-next-line */
				return left + right;
			case '-':
				return num(left) - num(right);
			case '*':
				return num(left) * num(right);
			case '/':
				return num(left) / div(right);
			case '%':
				return num(left) % div(right);
			case '&&':
				return left !== false && right;
			case '||':
				return left !== false ? left : right;
			case '<':
				return num(left) < num(right);
			case '>':
				return num(left) > num(right);
			case '<=':
				return num(left) <= num(right);
			case '>=':
				return num(left) >= num(right);
			case '==':
				return left === right;
			case '!=':
				return left !== right;
			default:
				throw new Error(`Unknown operator ${op}`);
		}
	}
}

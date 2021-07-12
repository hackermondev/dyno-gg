require('source-map-support').install();

import * as dotenv from 'dotenv';
import * as Eris from 'eris';
import * as glob from 'glob-promise';
import * as path from 'path';
import {Environment} from './Environment';
import {Interpreter} from './Interpreter';

dotenv.config({
	path: path.join(__dirname, '../.env'),
});

if (process.env.DYNO_TOKEN === undefined) {
	throw new Error('DYNO_TOKEN is not defined');
}

async function getFiles(): Promise<string[]> {
	try {
		return await glob('**/*.{js,ts}', {
			cwd: path.join(__dirname, 'methods'),
			root: path.join(__dirname, 'methods'),
			absolute: true,
		});
	} catch (err) {
		throw err;
	}
}

async function loadEnv(client: Eris.Client, env: any, options: ExecuteOptions) {
	const files: string[] = await getFiles();

	for (const file of files) {
		const MethodClass = require(file);
		const methods = new MethodClass(client, options);

		if (methods.getters) {
			for (const name of methods.getters) {
				env.defVar(name, methods[name]);
			}
		}

		for (const name of Object.getOwnPropertyNames(methods)) {
			if (name.startsWith('_')) {
				continue;
			}

			const property = methods[name];
			if (property === MethodClass) {
				continue;
			}

			if (MethodClass.isClass) {
				if (property instanceof Function) {
					env.methods[MethodClass.className] = env.methods[MethodClass.className] !== undefined ?
						env.methods[MethodClass.className] : {};
					env.methods[MethodClass.className][name] = property;
				} else {
					env.vars[MethodClass.className] = env.vars[MethodClass.className] !== undefined ?
						env.vars[MethodClass.className] : {};
					env.vars[MethodClass.className][name] = property;
				}
			} else {
				if (property instanceof Function) {
					env.methods[name] = property.bind(methods);
				} else {
					env.defVar(name, property);
				}
			}
		}

		for (const name of Object.getOwnPropertyNames(Object.getPrototypeOf(methods))) {
			if (name.startsWith('_')) {
				continue;
			}

			const method = methods[name];
			if (!(method instanceof Function) || method === MethodClass) {
				continue;
			}

			if (MethodClass.isClass) {
				env.methods[MethodClass.className] = methods;
			} else {
				env.methods[name] = method.bind(methods);
			}
		}
	}
}

export async function execute(command: string, options?: ExecuteOptions) {
	let client: Eris.Client;

	if (options !== undefined && options.client !== undefined) {
		client = options.client;
	} else {
		client = new Eris.Client(`Bot ${process.env.DYNO_TOKEN}`, { restMode: true });
	}

	const globalEnv = new Environment();
	await loadEnv(client, globalEnv, options);

	const env = options !== undefined ? options.env : {};
	const program = new Interpreter(globalEnv, env);
	const isCLI = options !== undefined && options.isCLI !== undefined;

	return program.execute(command, isCLI);
}

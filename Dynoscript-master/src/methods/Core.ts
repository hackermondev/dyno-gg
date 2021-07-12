import * as eris from 'eris';
import * as superagent from 'superagent';

/**
 * Dynoscript core methods
 * @class Core
 */
class Core {
	private _client: eris.Client;

	constructor(client: eris.Client) {
		this._client = client;
	}

	public get getters(): string[] {
		return [ 'now' ];
	}

	public get now(): Date {
		return new Date();
	}

	protected get client(): eris.Client {
		return this._client;
	}

	public debug(env: IEnvironment, value: any): void {
		console.log(value);
	}

	public toString(env: IEnvironment, value: any): string {
		return value.toString();
	}

	public async fetch(env: IEnvironment, ...args: MethodArguments): Promise<any> {
		if (args === undefined || args.length === 0) {
			throw new Error('Invalid arguments');
		}

		const url = this._stringOrVal(args, 'url');
		const argsObj = this._argsToObj(args);
		const headers = argsObj.headers;
		const method = argsObj.method === undefined ? 'get' : argsObj.method;
		const request = superagent[method];

		let result;

		if (!url) {
			throw new Error('No url provided');
		}

		try {
			if (headers) {
				const parsedHeaders = {};
				for (const key of Object.keys(headers)) {
					if (parsedHeaders.hasOwnProperty(key)) {
						parsedHeaders[key] = headers[key];
					}
				}
				result = await request(url)
					.timeout({
						response: 1000,
						deadline: 5000,
					})
					.set(parsedHeaders);
			} else {
				result = await request(url).timeout({
					response: 1000,
					deadline: 5000,
				});
			}

			if (result.text) {
				let parsed;

				try {
					parsed = JSON.parse(result.text);
				} catch (err) {
					parsed = result.text;
				}

				return parsed;
			} else if (result.body) {
				return result.body;
			} else {
				return;
			}
		} catch (err) {
			return null;
		}
	}

	public async send(env: IEnvironment, ...args: MethodArguments): Promise<eris.Message | false> {
		if (args === undefined || args.length === 0) {
			throw new Error('Invalid arguments');
		}

		let channel = this._stringOrVal(args, 'channel');
		const argsObj = this._argsToObj(args);
		const content = argsObj.content;

		if (!channel) {
			if (env.hasVar('channel')) {
				channel = env.getVar('channel');
			} else {
				throw new Error('Expected a channel argument.');
			}
		}

		let message: eris.Message;
		let messageObject;

		try {
			message = await this.client.createMessage(channel, content);
		} catch (err) {
			return false;
		}

		if (typeof argsObj.deleteAfter === 'number') {
			const interval = parseInt(argsObj.deleteAfter, 10);

			if (interval >= 1000 && interval < 10000) {
				await new Promise((resolve: any, reject: any) =>
					setTimeout(() => this.client.deleteMessage(channel, message.id).then(resolve).catch(resolve),
					parseInt(argsObj.deleteAfter, 10)));
			}
		}

		if (message !== undefined && message.toJSON !== undefined) {
			messageObject = message.toJSON();
		}

		return messageObject;
	}

	public async edit(env: IEnvironment, ...args: MethodArguments): Promise<eris.Message | false> {
		if (args === undefined || args.length === 0) {
			throw new Error('Invalid arguments');
		}

		let channel = this._stringOrVal(args, 'channel');
		const argsObj = this._argsToObj(args);
		const content = argsObj.content;

		if (!channel) {
			if (env.hasVar('channel')) {
				channel = env.getVar('channel');
			} else {
				throw new Error('Expected a channel argument.');
			}
		}

		if (argsObj.message === undefined) {
			throw new Error('Expected a message argument.');
		}

		const message = typeof argsObj.message === 'object' ? argsObj.message.id : argsObj.message;
		if (typeof message !== 'string') {
			throw new Error('Message should be a message object or string id.');
		}

		let msg: eris.Message;
		let messageObject;

		try {
			msg = await this.client.editMessage(channel, message, content);
		} catch (err) {
			return false;
		}

		if (msg !== undefined && msg.toJSON !== undefined) {
			messageObject = msg.toJSON();
		}

		return messageObject;
	}

	public async embed(env: IEnvironment, ...args: MethodArguments): Promise<eris.Message | false> {
		if (args === undefined || args.length === 0) {
			throw new Error('Invalid arguments');
		}

		const embed = this._argsToObj(args);
		let channel = embed.channel;

		delete embed.channel;
		if (!channel) {
			if (env.hasVar('channel')) {
				channel = env.getVar('channel');
			} else {
				throw new Error('Expected a channel argument.');
			}
		}

		if (embed.image && typeof embed.image === 'string') {
			embed.image = { url: embed.image.toString() };
		}

		if (embed.footer && typeof embed.footer === 'string') {
			embed.footer = { text: embed.footer.toString() };
		}

		if (embed.thumbnail && typeof embed.thumbnail === 'string') {
			embed.thumbnail = { url: embed.thumbnail.toString() };
		}

		if (embed.color) {
			if (/^#[0-9A-F]{6}$/i.test(embed.color)) {
				embed.color = this.hexToInt(embed.color);
			} else if (embed.color === 'random') {
				const hex = `00000${(Math.random() * (1 << 24) | 0).toString(16)}`.slice(-6);
				embed.color = this.hexToInt(hex);
			}
		}

		if (embed.fields && embed.fields.length > 0) {
			embed.fields = embed.fields.map((field: EmbedField) => {
				if (Array.isArray(field)) {
					field = {
						name: field[0],
						value: field[1] !== undefined ? field[1] : '',
						inline: field[2] !== undefined ? field[2] : false,
					};
				}
				field.name = field.hasOwnProperty('name') ? field.name.toString() : '';
				field.value = field.hasOwnProperty('value') ? field.value.toString() : '';
				if (field.inline !== undefined) {
					field.inline = Boolean(field.inline);
				}

				return field;
			});
		}

		let message: eris.Message;
		let messageObject;

		try {
			message = await this.client.createMessage(channel, { embed });
		} catch (err) {
			return false;
		}

		if (message !== undefined && message.toJSON !== undefined) {
			messageObject = message.toJSON();
		}

		return messageObject;
	}

	private _argsToObj(args: MethodArguments): any {
		return args.reduce(
			(a: object, b: MethodArgument) => {
				if (typeof b === 'object' && b.hasOwnProperty('key')) {
					a[b.key] = b.value;
				}

				return a;
			},
			{},
		);
	}

	private _stringOrVal(args: MethodArguments, prop: string): any {
		const index = args.findIndex((arg: MethodArgument) =>
			typeof arg === 'string' || typeof arg.key === 'string' && arg.key === prop);

		if (index === -1) {
			return null;
		}

		let val = args.splice(index, 1).shift();
		val = typeof val === 'string' ? val : val.value;

		return val;
	}

	private hexToInt(color: string): number {
		return color.startsWith('#') ? parseInt(color.replace('#', ''), 16) : parseInt(color, 16);
	}
}

export = Core;

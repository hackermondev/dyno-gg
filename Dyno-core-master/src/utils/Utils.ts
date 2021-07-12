import * as eris from '@dyno.gg/eris';
import * as bluebird from 'bluebird';
import * as crypto from 'crypto';
import * as fslib from 'fs';
import * as http from 'http';
import * as moment from 'moment';
import * as path from 'path';

const fs = bluebird.promisifyAll(fslib);
const MAX_ITERATIONS_PER_TICK = 500;

export default class Utils {
	private channelRegex: RegExp = new RegExp('{#([a-zA-Z0-9-_]+)}', 'g');
	private roleRegex: RegExp = new RegExp('{&([^}]+)}', 'g');
	private userRegex: RegExp = new RegExp('{@([^}]+)}', 'g');
	private cleanRegex: RegExp = new RegExp('([_\*`])', 'g');
	private lastMessage: number;
	private colors: {} = {
		// blue: { hex: '#117ea6' },
		blue: { hex: '#337FD5' },
		// green: { hex: '#23d160' },
		green: { hex: '#43b581' },
		orange: { hex: '#ff470f' },
		premium: { hex: '#e67e22' },
		yellow: { hex: '#fada5e' },
		// red: { hex: 'ed4337' },
		red: { hex: '#f04947' },
	};

	constructor() {
		for (const key in this.colors) {
			this.colors[key].int = this.hexToInt(this.colors[key].hex);
		}
	}

	/**
	 * Returns files within a directory recursively
	 */
	public async readdirRecursive(dir: string): Promise<string[]> {
		let list = [];
		let files = await fs.readdirAsync(dir).catch(() => []);
		let dirs;

		function isDir(fname: string) {
			return fs.statSync(path.join(dir, fname)).isDirectory();
		}

		dirs = files.filter(isDir);

		files = files.filter((file: string) => !isDir(file));
		files = files.map((file: string) => path.join(dir, file));

		list = list.concat(files);

		while (dirs.length) {
			const l = await this.readdirRecursive(path.join(dir, dirs.shift()));
			list = list.concat(l);
		}

		return Promise.resolve(list);
	}

	/**
	 * Check if file exists
	 */
	public existsSync(file: string): boolean {
		try {
			fs.accessSync(file);
			return true;
		} catch (e) {
			return false;
		}
	}

	public sha256(data: string): string {
		return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
	}

	/**
	 * Returns a random number between min (inclusive) and max (exclusive)
	 */
	public getRandomArbitrary(min: number, max: number): number {
		return Math.random() * (max - min) + min;
	}

	/**
	 * Returns a random integer between min (inclusive) and max (inclusive)
	 * Using Math.round() will give you a non-uniform distribution!
	 */
	public getRandomInt(min: number, max: number): number {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	/**
	 * Pad a string
	 */
	public pad(str: string|number, n: number): string {
		if (typeof str === 'number') {
			str = str.toString();
		}

		if (!str) {
			return ' '.repeat(n);
		}

		return str.length < n ? (str + ' '.repeat(n)).slice(0, n) : str;
	}

	/**
	 * Left pad a string
	 */
	public lpad(str: string|number, n: number): string {
		if (typeof str === 'number') {
			str = str.toString();
		}
		if (!str) {
			return ' '.repeat(n);
		}

		return str.length < n ? (' '.repeat(n) + str).slice(-(n - str.length)) : str;
	}

	public sumKeys(key: string, data: any[]) {
		return data.reduce((a: number, b: {}) => a + parseInt(b[key], 10), 0);
	}

	/**
	 * Uppercase the first letter in a word
	 */
	public ucfirst(str: string): string {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}

	/**
	 * Shuffle array, taken from stackoverflow
	 */
	public shuffleArray(arr: any[]): any[] {
		for (let i = arr.length; i; i--) {
			const j = Math.floor(Math.random() * i);
			[arr[i - 1], arr[j]] = [arr[j], arr[i - 1]];
		}

		return arr;
	}

	// toCamelCase(str) {
	// 	return str.toLowerCase().replace(/(-|_)([a-z])/g, match => match[1].toUpperCase());
	// }

	/**
	 * Escape special characters in regex
	 */
	public regEscape(str: string): string {
		return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
	}

	/**
	 * Split a message or message array by a number of characters
	 */
	public splitMessage(message: string|string[], len: number): string[] {
		const msgArray = [];

		if (!message) {
			return [];
		}

		if (Array.isArray(message)) {
			message = message.join('\n');
		}

		if (message.length > len) {
			let str = '';
			let pos;
			while (message.length > 0) {
				let index = message.lastIndexOf('\n', len);
				if (index === -1) {
					index = message.lastIndexOf(' ', len);
				}

				pos = (message.length >= len && index !== 0) ? index : message.length;

				// if there's no newlines
				if (pos > len) {
					pos = len;
				}

				// grab the substring, and remove from message
				str = message.substr(0, pos);
				message = message.substr(pos);

				// push to array
				msgArray.push(str);
			}
		} else {
			msgArray.push(message);
		}

		return msgArray;
	}

	public clean(str: string) {
		return str.replace(this.cleanRegex, '\\$&');
	}

	/**
	 * Get the full username and discriminator for a user or member
	 */
	public fullName(user: any, escape: boolean = true): string {
		user = user.user || user;

		const discrim = user.discriminator || user.discrim;
		let username = user.username || user.name;

		if (!username) {
			return user.id;
		}

		username = this.clean(username);

		if (escape) {
			username.replace(/\\/g, '\\\\').replace(/`/g, `\`${String.fromCharCode(8203)}`);
		}

		return `${username}#${discrim}`;
	}

	public regionEnabled(guild: eris.Guild, config: any): boolean {
		if (!guild.region || !config.regions) {
			return false;
		}

		if (config.regions.includes(guild.region)) {
			return true;
		}

		return false;
	}

	/**
	 * Send a message to discord
	 */
	public async sendMessage(channel: eris.TextableChannel, message: any, options: any = {}): Promise<any> {
		if (!channel || !message) {
			return Promise.resolve();
		}

		if (Array.isArray(message)) {
			message = message.join('\n');
		}

		message = typeof message === 'string' ? { content: message, disableEveryone: true } : message;
		message.disableEveryone = options.disableEveryone != undefined ? options.disableEveryone : true;

		if (options.dm) {
			const user = options.dm.user || options.dm;
			channel = await user.getDMChannel().catch(() => false);
			if (!channel) {
				return Promise.reject('Unable to get or create a DM with this user.');
			}
		}

		return channel.createMessage(message).then((msg: eris.Message) => {
			this.lastMessage = Date.now();

			if (options.pin) {
				msg.pin();
			}
			if (options.deleteAfter) {
				setTimeout(() => {
					msg.delete().catch(() => false);
				}, options.deleteAfter);
			}
			return msg;
		}).catch((err: any) => err);
	}

	public sendCode(channel: eris.TextableChannel, message: string = ' ', lang: string = '', options: any = {}): Promise<eris.Message> {
		let msg = `\`\`\`${lang}\n${message}\`\`\``;

		if (options.header) {
			msg = `${options.header}\n${msg}`;
		}

		if (options.footer) {
			msg = `${msg}\n${options.footer}`;
		}

		return this.sendMessage(channel, msg, options);
	}

	/**
	 * Sort roles by position or id
	 */
	public sortRoles(roles: any): eris.Role[] {
		return roles.size ?
			[...roles.values()].sort((r1: eris.Role, r2: eris.Role) =>
				(r1.position !== r2.position) ? r2.position - r1.position : <any>r1.id - <any>r2.id) :
				roles.sort((r1: eris.Role, r2: eris.Role) => (r1.position !== r2.position) ? r2.position - r1.position : <any>r1.id - <any>r2.id);
	}

	/**
	 * Get the highest role of a guild member
	 */
	public highestRole(guild: eris.Guild, member: eris.Member): eris.Role {
		if (!member || !member.roles.length) {
			return;
		}
		let roles = member.roles.map((id: string) => guild.roles.get(id));
		roles = this.sortRoles(roles);
		return roles[0];
	}

	/**
	 * Check if the bot has the role hierarchy to modify a given role
	 */
	public hasRoleHierarchy(guild: eris.Guild, clientMember: eris.Member, role: eris.Role): boolean {
		if (!guild || !clientMember) {
			return false;
		}

		for (const r of clientMember.roles) {
			const guildRole = guild.roles.get(r);
			if (guildRole.id === role.id) {
				continue;
			}
			if (guildRole.position > role.position) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Replacer method for user entered content
	 */
	public replacer(content: string, data: any, mentionUser: boolean = true) {
		const time = moment();

		if (data.guild) {
			content = content.replace(/{server}/gi, data.guild.name);
		}

		if (data.channel) {
			content = content.replace(/{channel}/gi, `<#${data.channel.id}>`);
		}

		if (data.user) {
			content = content
				.replace(/{user}/gi, mentionUser ? `<@${data.user.id}>` : this.fullName(data.user))
				.replace(/{username}/gi, data.user.username);
		}

		return content
			.replace(/{date}/gi, time.format('DD/MM/YYYY'))
			.replace(/{everyone}/gi, '@everyone')
			.replace(/{here}/gi, '@here')
			.replace(/{urlencode:(.*)}/g, (match: string, value: any) => encodeURIComponent(value))
			.replace(this.channelRegex, (match: string, name: string) => {
				const channel = data.guild.channels.find((g: any) => g.name === name);
				return channel ? `<#${channel.id}>` : '';
			})
			.replace(this.roleRegex, (match: string, name: string) => {
				const role = data.guild.roles.find((r: any) => r.name === name);
				return role ? `<@&${role.id}>` : '';
			})
			.replace(this.userRegex, (match: string, name: string) => {
				const user = data.guild.members.find((u: any) => u.username === name);
				return user ? `<@${user.id}>` : '';
			});
	}

	/**
	 * Convert hex color to integer
	 */
	public hexToInt(color: string): number {
		return color.startsWith('#') ? parseInt(color.replace('#', ''), 16) : parseInt(color, 16);
	}

	public getColor(color: string): number {
		const result = this.colors[color];
		return result ? result.int : null;
	}

	public parseTimeLimit(limit: string|number): number {
		if (!isNaN(<number>limit)) {
			return parseInt(<string>limit, 10);
		}
		const [int, str] = (<string>limit).replace(/([\.,])/g, '').match(/[a-zA-Z]+|[0-9]+/g);
		if (!int || !str || isNaN(<any>int)) {
			return;
		}

		const num = parseInt(int, 10);

		switch (str[0]) {
			case 'm':
				return num;
			case 'h':
				return Math.round(num * 60);
			case 'd':
				return Math.round(num * 60 * 24);
			case 'w':
				return Math.round(num * 60 * 24 * 7);
			default:
				return;
		}
	}

	/**
	 * Method to convert bytes to human readable form
	 * @param   {Number} bytes    Number of bytes
	 * @param   {Number} [decimals] Number of decimals
	 * @returns {String}          Formatted number
	 */
	public formatBytes(bytes: number, decimals: number): string {
		if (bytes === 0) {
			return '0 Byte';
		}
		const k = 1024;
		const dm = decimals || 3;
		const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
	}

	/**
	 * Runs an asnychronous iteration over an object or array.
	 * Iteration cycles are spread over multiple ticks according to maxIterationsPerTick.
	 * The function can throw an error with the message "resolve" to stop the iteration.
	 *
	 * Credit to Ayana developers for this method
	 *
	 * @license MIT
	 * @author Ayana Developers <https://gitlab.com/ayana>
	 * @param o The object or array to be iterated over
	 * @param fn The async function to be called on every interation
	 * @param maxIterationsPerTick The max iteration that should be done per tick
	 * @returns A promise that resolves when the operation is done. Will reject when fn throws an unexpected error.
	 */
	public asyncForEach<V>(o: V[] | { [k: string]: V }, fn: (v: V, k: string|number, o: V[] | { [k: string]: V }, offset: number) =>
		void, maxIterationsPerTick?: number): Promise<void> {
			if (maxIterationsPerTick == null) {
				maxIterationsPerTick = MAX_ITERATIONS_PER_TICK;
			}

			return new Promise((resolve: any, reject: any) => {
				const keys = Object.keys(o);
				let offset = 0;
				if (keys.length < 1) {
					return resolve();
				}

				(function next() {
					try {
						const left = keys.length - offset;
						const max = offset + (left > maxIterationsPerTick ? maxIterationsPerTick : left);
						for (offset; offset < max; offset++) {
							fn((<any>o)[keys[offset]], keys[offset], o, offset);
						}
						offset--;
					} catch (e) {
						if (e.message === 'resolve') {
							return resolve();
						}
						return reject(e);
					}

					if (++offset < keys.length) {
						global.setImmediate(next);
					} else {
						resolve();
					}
				}());
			});
	}
}

export const utils = new Utils();

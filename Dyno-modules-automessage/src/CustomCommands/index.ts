import {Module} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as each from 'async-each';
import * as dyno from 'Dyno';
import * as commands from './commands';
import Parser from './Parser';

/**
 * CustomCommands Module
 * @class CustomCommands
 * @extends Module
 */
export default class CustomCommands extends Module {
	public module      : string  = 'CustomCommands';
	public friendlyName: string  = 'Custom Commands';
	public description : string  = 'Create custom commands that with a variety of options.';
	public list        : boolean = true;
	public enabled     : boolean = true;
	public hasPartial  : boolean = true;
	public commands    : {}      = commands;

	private reqRoleRegex: RegExp = new RegExp(/{require: (.*)}/, 'g');
	private negRoleRegex: RegExp = new RegExp(/{not:(.*)}/, 'g');
	private reqChannelRegex: RegExp = new RegExp(/{require:#(.*)}/, 'g');
	private negChannelRegex: RegExp = new RegExp(/{not:#(.*)}/, 'g');

	private commandRegex: RegExp = new RegExp(/{!(.*)}/, 'g');
	private argsRegex: RegExp = new RegExp(/\$([0-9\+]+)/, 'g');
	private mentionRegex: RegExp = new RegExp(/\$([0-9]+)\.user\.([a-zA-Z]+)/, 'g');
	private textRegex: RegExp = new RegExp(/{=(?:([\w_-]+)=)?(.*)}/, 'g');
	private resChannelRegex: RegExp = new RegExp(/{respond:#(.*)}/);
	private sendRegex: RegExp = new RegExp(/{send([#a-zA-Z-_])?:(.*)}/);
	private dmRegex: RegExp = new RegExp(/{dm:(.*)}/);

	get settings() {
		return {
			commands: { type: Object, default: {} },
		};
	}

	public start() {
		this.parser = new Parser(this);
		this._cooldowns = new Map();
		this.schedule('*/2 * * * *', this.clearCooldowns.bind(this));
	}

	/**
	 * Handle new message
	 * @param {Message} message Message object
	 * @returns {*}
	 */
	// tslint:disable-next-line:cyclomatic-complexity
	public messageCreate({ message, guildConfig }: any) {
		if (!message.channel.guild ||
			!message.member ||
			(message.author && message.author.bot)) { return; }

		if (!this.isEnabled(message.channel.guild, this, guildConfig)) { return; }

		guildConfig.prefix = guildConfig.prefix || '?';

		if (!message.content.startsWith(guildConfig.prefix)) { return; }
		if (!guildConfig.customcommands || !guildConfig.customcommands.commands) { return; }

		const globalConfig = this.dyno.globalConfig || {};
		if (globalConfig.ignoredUsers && globalConfig.ignoredUsers.includes(message.author.id)) {
			return;
		}

		const cmds = guildConfig.customcommands.commands;
		const params = message.content.split(' ');
		const cmd = params[0].replace(guildConfig.prefix, '').toLowerCase();
		const coreCommand = this.dyno.commands.get(cmd);

		if (coreCommand && coreCommand.permissions !== 'admin') { return; }
		if (!cmd.length || !cmds[cmd]) { return; }
		if (cmds[cmd].disabled) { return; }

		const cooldown = this._cooldowns.get(message.author.id);
		if (cooldown && (Date.now() - cooldown) < 2000) { return; }
		this._cooldowns.set(message.author.id, Date.now());

		process.nextTick(() => this.statsd.increment('customcommands.all'));

		let response = commands[cmd].response;
		let deleteAfter = false;

		const data = {
			guild: message.channel.guild,
			channel: message.channel,
			user: message.member,
			guildConfig,
		};

		const sendOpts = { disableEveryone: false, dm: null };

		if (response.includes('{noeveryone}')) {
			sendOpts.disableEveryone = true;
		}

		response = this.canExecute(response, data);
		if (!response) { return; }

		response = response.replace(this.argsRegex, (match: any, index: any) => {
			if (params.slice(1).length < index) { return; }

			let r;

			if (index.includes('+')) {
				index = index.replace('+', '');
				r = params.slice(1).slice(--index).join(' ');
			} else {
				r = params.slice(1)[--index];
			}

			r = r.replace(/({|})/g, '');
			return r;
		});

		response = this.parser.parse(response, data);
		if (!response) { return; }

		if (response.includes('{delete}')) {
			deleteAfter = true;
			response = response.replace(/{delete}/gi, '');
		}

		if (response.includes('<@')) {
			response = response.replace(this.mentionRegex, (match: any, index: any, key: any) => {
				if (params.slice(1).length < index) { return; }

				const user = message.mentions[--index];

				if (typeof user[key] !== 'string' && typeof user[key] !== 'number') {
					return '';
				}
				return user[key];
			});
		}

		if (response.includes('{dm}')) {
			sendOpts.dm = message.author;
			response = response.replace(/{dm}/g, '');
		} else if (response.includes('{dm:')) {
			const dmUser = this.getDMUser(message, response);
			if (dmUser) {
				sendOpts.dm = dmUser;
				response = response.replace(this.dmRegex, '');
			} else {
				response = 'Unable to find user to DM.';
			}
		}

		const responseChannel = this.getResponseChannel(message, response);
		const channel = responseChannel || message.channel;

		if (response.includes('{respond')) {
			response = response.replace(this.resChannelRegex, '');
		}

		// if (response.indexOf('{send') > -1) {
		// 	response = this.sendMessages(response, data);
		// }

		if (response.indexOf('{!') > -1) {
			return this.executeCommands(response, message, guildConfig, { responseChannel }).then((res: string) => {
				if (res && res.length) {
					if (responseChannel) {
						res = res.replace(/{respond:#([a-zA-Z-_]+)}/g, '');
					}

					if (sendOpts.dm) {
						res = `${message.channel.guild.name}: ${res}`;
					}

					return this.sendMessage(channel, res, sendOpts)
						.catch(() => false)
						.then(() => {
							if (deleteAfter) {
								message.delete().catch(() => false);
							}
							process.nextTick(() => this.statsd.increment('customcommands.executed'));
						});
				}
			});
		}

		if (response && response.length) {
			if (responseChannel) {
				response = response.replace(/{respond:#([a-zA-Z-_]+)}/g, '');
			}

			return this.sendMessage(channel, response, sendOpts)
				.catch(() => false)
				.then(() => {
					if (deleteAfter) {
						message.delete().catch(() => false);
					}
					process.nextTick(() => this.statsd.increment('customcommands.executed'));
				});
		}
	}

	private canExecute(response: string, e: any) {
		if (!response) { return; }

		if (response && (response.includes('{require:#') || response.includes('{not:#'))) {
			response = this.requireChannels(response, e);
		}

		if (response && (response.includes('{require:') || response.includes('{not:'))) {
			response = this.requireRoles(response, e);
		}

		return response;
	}

	private requireRoles(response: string, e: any) {
		const { guild, channel, user } = e;

		let nmatch;

		if (guild.ownerID === user.id) {
			return response
				.replace(this.reqRoleRegex, '')
				.replace(this.negRoleRegex, '');
		}

		// tslint:disable-next-line:no-conditional-assignment
		while ((nmatch = this.negRoleRegex.exec(response)) !== null) {
			const str = nmatch[1];
			const role = this.resolveRole(guild, str);
			if (!role) { continue; }

			if (user.roles.includes(role.id)) {
				response = '';
			}
		}

		if (response.includes('{not:')) {
			response = response.replace(this.negRoleRegex, '');
		}

		if (!response.includes('{require:')) {
			return response;
		}

		let match;

		// tslint:disable-next-line:no-conditional-assignment
		while ((match = this.reqRoleRegex.exec(response)) !== null) {
			const require = match[1];

			if (this.permissionsManager.isServerAdmin(user, channel)) {
				return response.replace(this.reqRoleRegex, '');
			} else if (require === 'serverAdmin') {
				return null;
			}

			if (require === 'serverMod' && this.permissionsManager.isServerMod(user, channel)) {
				return response.replace(this.reqRoleRegex, '');
			}
			const role = this.resolveRole(guild, require);
			if (!role) { continue; }

			if (user.roles.includes(role.id)) {
				return response.replace(this.reqRoleRegex, '');
			}
		}

		return null;
	}

	private requireChannels(response: string, e: any) {
		const { channel } = e;

		let nmatch;

		// tslint:disable-next-line:no-conditional-assignment
		while ((nmatch = this.negChannelRegex.exec(response)) !== null) {
			const exclude = nmatch[1];
			if (channel.name.toLowerCase() === exclude.toLowerCase()) {
				return null;
			}
		}

		if (response.includes('{not:#')) {
			response = response.replace(this.negChannelRegex, '');
		}

		if (!response.includes('{require:#')) {
			return response;
		}

		let match;

		// tslint:disable-next-line:no-conditional-assignment
		while ((match = this.reqChannelRegex.exec(response)) !== null) {
			const require = match[1];

			if (channel.name.toLowerCase() === require.toLowerCase()) {
				return response.replace(this.reqChannelRegex, '');
			}
		}

		return null;
	}

	private getResponseChannel(message: eris.Message, response: string) {
		if (response.indexOf('{respond:#') === -1) {
			return message.channel;
		}

		const match = response.match(this.resChannelRegex);
		if (!match || !match.length || !match[1]) {
			return message.channel;
		}

		const channel = (<eris.GuildChannel>message.channel).guild.channels.find((c: eris.GuildChannel) => c.id === match[1] ||
						c.name.toLowerCase() === match[1].toLowerCase());

		if (!channel) {
			return message.channel;
		}

		return channel;
	}

	private getDMUser(message: eris.Message, response: string) {
		const userMatch = response.match(this.dmRegex);
		if (!userMatch) { return; }
		return this.resolveUser((<eris.GuildChannel>message.channel).guild, userMatch[1]);
	}

	private async executeCommands(response: string, message: eris.Message, guildConfig: dyno.GuildConfig, options: any = {}) {
		let match;
		const cmds = this.dyno.commands;

		const responseChannel = options.responseChannel;
		const suppressOutput = response.includes('{silent}');
		response = response.replace('{silent}', '');

		const usedCommands = new Map();

		// tslint:disable-next-line:no-conditional-assignment
		while ((match = this.commandRegex.exec(response)) !== null) {
			const commandString = match[1];

			const cmd = commandString.split(' ')[0];
			const args = commandString.split(' ').slice(1);
			const command = this.dyno.commands.get(cmd);

			if (!command || command.permissions === 'admin') { continue; }

			let usedCount = usedCommands.get(command.name) || 0;

			if (command.name === 'warn' && usedCommands.has('warn')) {
				continue;
			}

			if (usedCount && usedCount >= 3) {
				continue;
			}

			usedCommands.set(command.name, ++usedCount);

			if (command) {
				const c = new command.constructor(this.dyno);
				c.name = c.aliases[0];

				const executeStart = Date.now();

				await c._execute({
					message,
					args,
					command: cmd,
					guildConfig,
					responseChannel: responseChannel,
					suppressOutput: suppressOutput,
				})
				.then(() => {
					const time = Date.now() - executeStart;
					cmds.emit('command', { command, message, guildConfig, args, time });
				})
				.catch(() => {
					const time = Date.now() - executeStart;
					cmds.emit('error', { command, message, guildConfig, args, time });
				});
			}

			await new Promise((res: any) => setTimeout(res, 30));
		}

		return response.replace(this.commandRegex, '');
	}

	private clearCooldowns() {
		each([...this._cooldowns.keys()], (id: string) => {
			const time = this._cooldowns.get(id);
			if ((Date.now() - time) < 2000) { return; }
			this._cooldowns.delete(id);
		});
	}
}

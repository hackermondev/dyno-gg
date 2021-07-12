import { Module } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as each from 'async-each';
import * as dyno from 'Dyno';
import * as moment from 'moment-timezone';
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

	private parser     : Parser;

	private reqRoleRegex: RegExp = new RegExp(/{require:(.*?)}/, 'g');
	private negRoleRegex: RegExp = new RegExp(/{not:(.*?)}/, 'g');
	private reqChannelRegex: RegExp = new RegExp(/{require:#(.*?)}/, 'g');
	private negChannelRegex: RegExp = new RegExp(/{not:#(.*?)}/, 'g');
	private commandRegex: RegExp = new RegExp(/{!((?:(?:.|\n)(?:{.+})*)+?)}/, 'g');
	private argsRegex: RegExp = new RegExp(/\$([0-9\+]+)/, 'g');
	private argUserRegex: RegExp = new RegExp(/\$([0-9]+)\.user\.([a-zA-Z]+)/, 'g');
	private argRoleRegex: RegExp = new RegExp(/\$([0-9]+)\.role\.([a-zA-Z]+)/, 'g');
	private argChannelRegex: RegExp = new RegExp(/\$([0-9]+)\.channel\.([a-zA-Z]+)/, 'g');
	private textRegex: RegExp = new RegExp(/{=(?:([\w_-]+)=)?(.*)}/, 'g');
	private resChannelRegex: RegExp = new RegExp(/{respond:#(.*?)}/);
	// private sendRegex: RegExp = new RegExp(/{send([#a-zA-Z-_])? (.*)}/);
	private dmRegex: RegExp = new RegExp(/{dm:(.*?)}/);

	private _cooldowns: Map<string, any>;
	private _customCooldowns: Map<string, any>;

	get settings() {
		return {
			commands: { type: Object, default: {} },
		};
	}

	public start() {
		this.parser = new Parser(this);
		this._cooldowns = new Map();
		this._customCooldowns = new Map();
		this.schedule('*/2 * * * *', this.clearCooldowns.bind(this));
	}

	public async shouldCooldown(message: eris.Message, command: any, name: string) {
		try {
			const cooldown = await this.redis.get(`${this.config.client.id}.${name}.${message.author.id}`);

			if (command.cooldown && cooldown && (Date.now() - cooldown) < command.cooldown) {
				return true;
			}

			return false;
		} catch (err) {
			this.logger.error(err);
			return false;
		}
	}

	/**
	 * Handle new message
	 * @param {Message} message Message object
	 * @returns {*}
	 */
	// tslint:disable-next-line:cyclomatic-complexity
	public async messageCreate({ message, guildConfig }: any) {
		if (!message.channel.guild ||
			!message.member ||
			(message.author && message.author.bot)) { return; }

		if (!this.isEnabled(message.channel.guild, this, guildConfig)) { return; }

		guildConfig.prefix = guildConfig.prefix || '?';

		if (!message.content.startsWith(guildConfig.prefix) && !message.content.startsWith(this.config.localPrefix)) { return; }
		if (!guildConfig.customcommands || !guildConfig.customcommands.commands) { return; }

		const globalConfig = this.dyno.globalConfig || {};
		if (globalConfig.ignoredUsers && globalConfig.ignoredUsers.includes(message.author.id)) {
			return;
		}

		const cmds = guildConfig.customcommands.commands;
		const params = message.content.split(' ');
		const cmd = params[0].replace(guildConfig.prefix, '').replace(this.config.localPrefix, '').toLowerCase();
		const coreCommand = this.dyno.commands.get(cmd);

		if (coreCommand && coreCommand.permissions !== 'admin') { return; }
		if (!cmd.length || !cmds[cmd]) { return; }
		if (cmds[cmd].disabled) { return; }

		const cooldown = this._cooldowns.get(message.author.id);
		if (cooldown && (Date.now() - cooldown) < 2000) { return; }
		this._cooldowns.set(message.author.id, Date.now());

		process.nextTick(() => this.statsd.increment('customcommands.all'));

		const command = cmds[cmd];
		let response = command.response;
		let deleteCommand = command.delete || false;

		if (await this.shouldCooldown(message, command, cmd)) {
			return;
		}

		const data = {
			guild: message.channel.guild,
			channel: message.channel,
			user: message.member,
			guildConfig,
		};

		const sendOpts = {
			disableEveryone: command.noEveryone || false,
			dm: command.dm ? message.author : false,
		};

		if (response.includes('{noeveryone}')) {
			response = response.replace(/{noeveryone}/gi, '');
			sendOpts.disableEveryone = true;
		}

		response = this.canExecute(command, response, data);
		if (!response) { return; }

		const args = response.match(this.argsRegex);
		const argsCount = params ? params.length - 1 : 0;

		if (command.args && argsCount < command.args) {
			return;
		}

		let channel = message.channel;

		response = this.parser.parse(message, channel, response, data);
		if (!response) { return; }

		let responseChannel;

		if (command.responseChannel) {
			responseChannel = (<eris.GuildChannel>message.channel).guild.channels.find((c: eris.GuildChannel) => c.id === command.responseChannel);
		}

		if (!responseChannel) {
			responseChannel = this.getResponseChannel(message, response);
		}

		channel = responseChannel || message.channel;

		if (response.includes('{delete}')) {
			deleteCommand = true;
			response = response.replace(/{delete}/gi, '');
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

		if (response.includes('{respond')) {
			response = response.replace(this.resChannelRegex, '');
		}

		// if (response.indexOf('{send') > -1) {
		// 	response = this.sendMessages(response, data);
		// }

		if (response.indexOf('{!') > -1) {
			return this.executeCommands(command, response, message, guildConfig, { responseChannel }).then((res: string) => {
				if (res && res.length) {
					if (responseChannel) {
						res = res.replace(/{respond:#([a-zA-Z-_]+)}/g, '');
					}

					if (sendOpts.dm) {
						res = `${message.channel.guild.name}: ${res}`;
					}

					if (command.cooldown) {
						this.redis.set(`${this.config.client.id}.${cmd}.${message.author.id}`, Date.now(), 'PX', command.cooldown).catch(() => null);
					}

					if (command.responses && command.responses.length) {
						this.executeResponses(command, message, data);
					}

					return this.sendMessage(channel, res, sendOpts)
						.then((m: eris.Message) => {
							if (command.deleteAfter && !isNaN(command.deleteAfter)) {
								setTimeout(() => {
									if (!m || !m.channel) { return; }
									this.client.deleteMessage(m.channel.id, m.id).catch(() => null);
								}, command.deleteAfter * 1000);
							}
						})
						.catch(() => false)
						.then(() => {
							if (deleteCommand) {
								message.delete().catch(() => false);
							}

							process.nextTick(() => this.statsd.increment('customcommands.executed'));
						});
				} else {
					if (deleteCommand) {
						message.delete().catch(() => false);
					}
				}
			});
		} else {
			if (deleteCommand) {
				message.delete().catch(() => false);
			}
		}

		if (response && response.length) {
			if (responseChannel) {
				response = response.replace(/{respond:#([a-zA-Z-_]+)}/g, '');
			}

			if (sendOpts.dm) {
				response = `${message.channel.guild.name}: ${response}`;
			}

			if (command.cooldown) {
				this.redis.set(`${this.config.client.id}.${cmd}.${message.author.id}`, Date.now(), 'PX', command.cooldown).catch(() => null);
			}

			if (command.responses && command.responses.length) {
				this.executeResponses(command, message, data);
			}

			return this.sendMessage(channel, response, sendOpts)
				.then((m: eris.Message) => {
					if (command.deleteAfter && !isNaN(command.deleteAfter)) {
						setTimeout(() => {
							if (!m || !m.channel) { return; }
							this.client.deleteMessage(m.channel.id, m.id).catch(() => null);
						}, command.deleteAfter * 1000);
					}
				})
				.catch(() => false)
				.then(() => {
					if (deleteCommand) {
						message.delete().catch(() => false);
					}

					process.nextTick(() => this.statsd.increment('customcommands.executed'));
				});
		}
	}

	// tslint:disable-next-line:cyclomatic-complexity
	private canExecute(command: any, response: string, e: any) {
		if (!response) { return; }

		const { channel, user } = e;

		if (command.ignoredRoles && command.ignoredRoles.length) {
			const hasIgnoredRole = command.ignoredRoles.find((r: any) => e.user.roles.includes(r.id));
			if (hasIgnoredRole && !this.permissionsManager.isServerAdmin(user, channel)) {
				return null;
			}
		}

		if (command.allowedRoles && command.allowedRoles.length) {
			const hasAllowedRole = command.allowedRoles.find((r: any) => e.user.roles.includes(r.id));
			if (!hasAllowedRole && !this.permissionsManager.isServerAdmin(user, channel)) {
				return null;
			}
		}

		if (command.ignoredChannels && command.ignoredChannels.length) {
			if ((command.ignoredChannels.find((c: any) => c.id === e.channel.id || (e.channel.parentID && c.id === e.channel.parentID))) &&
				!this.permissionsManager.isServerAdmin(user, channel)) {
					return null;
				}
		}

		if (command.allowedChannels && command.allowedChannels.length) {
			if (!command.allowedChannels.find((c: any) => c.id === e.channel.id || (e.channel.parentID && c.id === e.channel.parentID)) &&
				!this.permissionsManager.isServerAdmin(user, channel)) {
					return null;
				}
		}

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
			return null;
		}

		const match = response.match(this.resChannelRegex);
		if (!match || !match.length || !match[1]) {
			return null;
		}

		const channel = (<eris.GuildChannel>message.channel).guild.channels.find((c: eris.GuildChannel) => c.id === match[1] ||
						c.name.toLowerCase() === match[1].toLowerCase());

		if (!channel) {
			return null;
		}

		return channel;
	}

	private getDMUser(message: eris.Message, response: string) {
		const userMatch = response.match(this.dmRegex);
		if (!userMatch) { return; }
		return this.resolveUser((<eris.GuildChannel>message.channel).guild, userMatch[1]);
	}

	private executeResponses(command: any, message: eris.Message, data: any) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		let channel;
		let sendDM;

		this.utils.asyncForEach(command.responses, async response => {
			if (!response.channel) { return; }
			switch (response.channel) {
				case 'commandChannel':
					channel = message.channel;
					break;
				case 'userChannel':
					sendDM = true;
					break;
				default:
					channel = guild.channels.find(c => c.id === response.channel);
					if (!channel) { return; }
					break;
			}

			// tslint:disable-next-line:switch-default
			switch (response.type) {
				case 'message':
					if (!response.value) { break; }

					const content = this.parser.parse(message, message.channel, response.value, data);

					return sendDM ?
						this.sendDM(message.author.id, content).catch(() => null) :
						this.sendMessage(channel, content).catch(() => null);
				case 'embed':
					if (!response.embed) { break; }
					try {
						// stringify the embed so we only have to run it through the parser once
						let embedStr = JSON.stringify(response.embed);
						embedStr = this.parser.parse(message, message.channel, embedStr, data);

						// parse it back to an object
						const embed = JSON.parse(embedStr);

						return sendDM ?
							this.sendDM(message.author.id, { embed }).catch(() => null) :
							this.sendMessage(channel, { embed }).catch(() => null);
					} catch (err) {
						this.logger.error(err);
						return;
					}
			}
		});
	}

	private async executeCommands(command: any, response: string, message: eris.Message, guildConfig: dyno.GuildConfig, options: any = {}) {
		let match;
		const cmds = this.dyno.commands;

		const responseChannel = options.responseChannel;
		const suppressOutput = command.silent || response.includes('{silent}');
		response = response.replace('{silent}', '');

		const usedCommands = new Map();

		// tslint:disable-next-line:no-conditional-assignment
		while ((match = this.commandRegex.exec(response)) !== null) {
			const commandString = match[1];

			const cmd = commandString.split(' ')[0];
			const args = commandString.split(' ').slice(1);
			const coreCommand = this.dyno.commands.get(cmd);

			if (!coreCommand || coreCommand.permissions === 'admin') { continue; }

			let usedCount = usedCommands.get(coreCommand.name) || 0;

			if (coreCommand.name === 'warn' && usedCommands.has('warn')) {
				continue;
			}

			if (usedCount && usedCount >= 3) {
				continue;
			}

			usedCommands.set(coreCommand.name, ++usedCount);

			if (coreCommand) {
				const c = new coreCommand.constructor(this.dyno);
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
					cmds.emit('command', { command: coreCommand, message, guildConfig, args, time });
				})
				.catch(() => {
					const time = Date.now() - executeStart;
					cmds.emit('error', { command: coreCommand, message, guildConfig, args, time });
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

		each([...this._customCooldowns.keys()], (id: string) => {
			const customCooldown = this._customCooldowns.get(id);
			if ((Date.now() - customCooldown.time) < customCooldown.cooldown) { return; }
			this._customCooldowns.delete(id);
		});
	}
}

'use strict';

const Module = Loader.require('./core/structures/Module');
const Parser = Loader.require('./modules/CustomCommands/Parser');
const statsd = require('../../core/statsd');

/**
 * CustomCommands Module
 * @class CustomCommands
 * @extends Module
 */
class CustomCommands extends Module {
	constructor(...args) {
		super(...args);

		this.module = 'CustomCommands';
		this.friendlyName = 'Custom Commands';
		this.description = 'Create custom commands that with a variety of options.';
		this.enabled = true;
		this.hasPartial = true;
	}

	static get name() {
		return 'CustomCommands';
	}

	get settings() {
		return {
			commands: { type: Object, default: {} },
		};
	}

	start() {
		this.parser = new Parser(this);
		this._cooldowns = new Map();
		this.schedule('*/1 * * * *', this.clearCooldowns.bind(this));

		this.reqRoleRegex = new RegExp(/{require:(.*)}/, 'g');
		this.negRoleRegex = new RegExp(/{not:(.*)}/, 'g');
		this.reqChannelRegex = new RegExp(/{require:#(.*)}/, 'g');
		this.negChannelRegex = new RegExp(/{not:#(.*)}/, 'g');

		this.commandRegex = new RegExp(/{!(.*)}/, 'g');
		this.argsRegex = new RegExp(/\$([0-9\+]+)/, 'g');
		this.mentionRegex = new RegExp(/\$([0-9]+)\.user\.([a-zA-Z]+)/, 'g');
		this.textRegex = new RegExp(/{=(?:([\w_-]+)=)?(.*)}/, 'g');
		this.resChannelRegex = new RegExp(/{respond:#(.*)}/);
		this.sendRegex = new RegExp(/{send([#a-zA-Z-_])?:(.*)}/);
		this.dmRegex = new RegExp(/{dm:(.*)}/);
	}

	clearCooldowns() {
		for (let [id, time] of this._cooldowns) {
			if ((Date.now() - time) < 2000) continue;
			this._cooldowns.delete(id);
		}
	}

	/**
	 * Handle new message
	 * @param {Message} message Message object
	 * @returns {*}
	 */
	messageCreate({ message, guildConfig }) {
		if (!message.channel.guild || !message.member) return;
		if (message.author && message.author.bot) return;

		// const guildConfig = await this.dyno.guilds.getOrFetch(message.channel.guild.id);
		if (!guildConfig) return;
		if (!this.isEnabled(message.channel.guild, this, guildConfig)) return;

		guildConfig.prefix = guildConfig.prefix || '?';

		if (!message.content.startsWith(guildConfig.prefix)) return;
		if (!guildConfig.customcommands || !guildConfig.customcommands.commands) return;

		const globalConfig = this.dyno.globalConfig || {};
		if (globalConfig.ignoredUsers && globalConfig.ignoredUsers.includes(message.author.id)) {
			return;
		}

		let commands = guildConfig.customcommands.commands,
			params   = message.content.split(' '),
			cmd      = params[0].replace(guildConfig.prefix, '').toLowerCase(),
			coreCommand = this.dyno.commands.get(cmd);

		if (coreCommand && coreCommand.permissions !== 'admin') return;
		if (!cmd.length || !commands[cmd]) return;

		const cooldown = this._cooldowns.get(message.author.id);
		if (cooldown && (Date.now() - cooldown) < 2000) return;
		this._cooldowns.set(message.author.id, Date.now());

		process.nextTick(() => statsd.increment('customcommands.all'));

		let response = commands[cmd].response,
			deleteAfter = false;

		let data = {
			guild: message.channel.guild,
			channel: message.channel,
			user: message.member,
			guildConfig,
		};

		const sendOpts = { disableEveryone: false };

		if (response.includes('{noeveryone}')) {
			sendOpts.disableEveryone = true;
		}

		response = this.canExecute(response, data);
		if (!response) return;

		response = response.replace(this.argsRegex, (match, index) => {
			if (params.slice(1).length < index) return;

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
		if (!response) return;

		if (response.includes('{delete}')) {
			deleteAfter = true;
			response = response.replace(/{delete}/gi, '');
		}

		if (response.includes('<@')) {
			response = response.replace(this.mentionRegex, (match, index, key) => {
				if (params.slice(1).length < index) return;

				const user = message.mentions[--index];

				if (typeof user[key] !== 'string' && typeof user[key] !== 'number') return '';
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

		var responseChannel = this.getResponseChannel(message, response);
		let channel = responseChannel || message.channel;

		if (response.includes('{respond')) {
			response = response.replace(this.resChannelRegex, '');
		}

		// if (response.indexOf('{send') > -1) {
		// 	response = this.sendMessages(response, data);
		// }

		if (response.indexOf('{!') > -1) {
			return this.executeCommands(response, message, guildConfig, { responseChannel }).then(response => {
				if (response && response.length) {
					if (responseChannel) {
						response = response.replace(/{respond:#([a-zA-Z-_]+)}/g, '');
					}

					return this.sendMessage(channel, response, sendOpts)
						.catch(() => false)
						.then(() => {
							if (deleteAfter) message.delete().catch(() => false);
							process.nextTick(() => statsd.increment('customcommands.executed'));
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
					if (deleteAfter) message.delete().catch(() => false);
					process.nextTick(() => statsd.increment('customcommands.executed'));
				});
		}
	}

	canExecute(response, e) {
		if (!response) return;

		if (response && (response.includes('{require:#') || response.includes('{not:#'))) {
			response = this.requireChannels(response, e);
		}

		if (response && (response.includes('{require:') || response.includes('{not:'))) {
			response = this.requireRoles(response, e);
		}

		return response;
	}

	requireRoles(response, e) {
		const { guild, channel, user } = e;

		let nmatch;

		if (guild.ownerID === user.id) {
			return response
				.replace(this.reqRoleRegex, '')
				.replace(this.negRoleRegex, '');
		}

		while ((nmatch = this.negRoleRegex.exec(response)) !== null) {
			const str = nmatch[1];
			const role = this.resolveRole(guild, str);
			if (!role) continue;

			if (user.roles.includes(role.id)) {
				return null;
			}
		}

		if (response.includes('{not:')) {
			response = response.replace(this.negRoleRegex, '');
		}

		if (!response.includes('{require:')) return response;

		let match;

		while ((match = this.reqRoleRegex.exec(response)) !== null) {
			const require = match[1];

			if (this.permissionsManager.isServerAdmin(user, channel)) {
				return response.replace(this.reqRoleRegex, '');
			} else if (require === 'serverAdmin') return null;

			if (require === 'serverMod' && this.permissionsManager.isServerMod(user, channel)) {
				return response.replace(this.reqRoleRegex, '');
			}
			const role = this.resolveRole(guild, require);
			if (!role) continue;

			if (user.roles.includes(role.id)) {
				return response.replace(this.reqRoleRegex, '');
			}
		}

		return null;
	}

	requireChannels(response, e) {
		const { channel } = e;

		let nmatch;

		while ((nmatch = this.negChannelRegex.exec(response)) !== null) {
			const exclude = nmatch[1];
			if (channel.name.toLowerCase() === exclude.toLowerCase()) {
				return null;
			}
		}

		if (response.includes('{not:#')) {
			response = response.replace(this.negChannelRegex, '');
		}

		if (!response.includes('{require:#')) return response;

		let match;

		while ((match = this.reqChannelRegex.exec(response)) !== null) {
			const require = match[1];

			if (channel.name.toLowerCase() === require.toLowerCase()) {
				return response.replace(this.reqChannelRegex, '');
			}
		}

		return null;
	}

	getResponseChannel(message, response) {
		if (response.indexOf('{respond:#') === -1) {
			return message.channel;
		}

		let match = response.match(this.resChannelRegex);
		if (!match || !match.length || !match[1]) {
			return message.channel;
		}

		const channel = message.channel.guild.channels.find(c => c.id === match[1] || c.name.toLowerCase() === match[1].toLowerCase());
		if (!channel) {
			return message.channel;
		}

		return channel;
	}

	getDMUser(message, response) {
		const userMatch = response.match(this.dmRegex);
		if (!userMatch) return;
		return this.resolveUser(message.guild, userMatch[1]);
	}

	async executeCommands(response, message, guildConfig, options = {}) {
		let match;
		const commands = this.dyno.commands;

		const responseChannel = options.responseChannel;
		const suppressOutput = response.includes('{silent}');
		response = response.replace('{silent}', '');

		let usedCommands = new Map();

		while ((match = this.commandRegex.exec(response)) !== null) {
			const commandString = match[1];

			const cmd = commandString.split(' ')[0],
				args = commandString.split(' ').slice(1);

			let command = this.dyno.commands.get(cmd);

			if (!command) continue;
			if (command.permissions === 'admin') continue;

			let usedCount = usedCommands.get(command.name) || 0;

			if (command.name === 'warn' && usedCommands.has('warn')) {
				continue;
			}

			if (usedCount && usedCount >= 3) {
				continue;
			}

			usedCommands.set(command.name, ++usedCount);

			if (command) {
				const c = new command.constructor();
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
					commands.emit('command', { command, message, guildConfig, args, time });
				})
				.catch(() => {
					const time = Date.now() - executeStart;
					commands.emit('error', { command, message, guildConfig, args, time });
				});
			}

			await Promise.delay(30);
		}

		return response.replace(this.commandRegex, '');
	}
}

module.exports = CustomCommands;

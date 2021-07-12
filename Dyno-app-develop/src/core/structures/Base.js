'use strict';

const logger = requireReload(require)('../logger');
const utils = requireReload(require)('../utils');
const Dyno = require('../Dyno');
const Role = requireReload(require)('../structures/Role');
const Resolver = requireReload(require)('../utils/Resolver');
const config = requireReload(require)('../config');
const models = require('../../core/models');
const redis = require('../../core/redis');
const statsd = require('../../core/statsd');

/**
 * @abstract Base
 */
class Base {
	/**
	 * Base class for common abstractions
	 * @param config
	 * @param dyno
	 *
	 * @prop {Client} client
	 * @prop {Object} config
	 * @prop {Logger} logger
	 */
	constructor() {
		if (new.target === Base) throw new TypeError('Cannot construct Module instances directly.');

		this._dyno = Dyno.instance;
		this._config = config;
		this._logger = logger;
	}

	toJSON() {
		const copy = {};

		for (const key in this) {
			if (!this.hasOwnProperty(key) || key.startsWith('_')) continue;

			if (!this[key]) {
				copy[key] = this[key];
			} else if (this[key] instanceof Set) {
				copy[key] = Array.from(this[key]);
			} else if (this[key] instanceof Map) {
				copy[key] = Array.from(this[key].values());
			} else if (typeof this[key].toJSON === 'function') {
				copy[key] = this[key].toJSON(key);
			} else {
				copy[key] = this[key];
			}
		}

		return copy;
	}

	inspect() {
		return this.toJSON();
	}

	/**
	 * Dyno instance
	 * @returns {Dyno}
	 */
	get dyno() {
		return this._dyno;
	}

	/**
	 * Eris client instance
	 * @returns {Eris}
	 */
	get client() {
		return this._dyno.client;
	}

	/**
	 * Eris rest client instance
	 * @return {Eris}
	 */
	get restClient() {
		return this._dyno.restClient;
	}

	/**
	 * Cluster data
	 * @return {Object} Cluster options
	 */
	get cluster() {
		return this._dyno.options;
	}

	/**
	 * Dyno configuration
	 * @returns {Object}
	 */
	get config() {
		return this._dyno.config;
	}

	/**
	 * Dyno global configuration
	 * @return {Object}
	 */
	get globalConfig() {
		return this._dyno.globalConfig;
	}

	/**
	 * Logger instance
	 * @returns {Logger}
	 */
	get logger() {
		return this._logger;
	}

	/**
	 * IPCManager instance
	 * @returns {IPCManager}
	 */
	get ipc() {
		return this._dyno.ipc;
	}

	/**
	 * WebhookManager instance
	 * @returns {WebhookManager}
	 */
	get webhooks() {
		return this._dyno.webhooks;
	}

	/**
	 * PermissionsManager instance
	 * @returns {PermissionsManager}
	 */
	get permissionsManager() {
		return this._dyno.permissions;
	}

	/**
	 * Dyno data models
	 * @return {Object} Data models
	 */
	get models() {
		return models;
	}

	/**
	 * Redis connection instance
	 * @return {Object} Redis connection instance
	 */
	get redis() {
		return redis;
	}

	/**
	 * Helper methods provided to commands and modules
	 * @return {Utils} Utils instance
	 */
	get utils() {
		return utils;
	}

	/**
	 * Check if the bot has permissions
	 * @param {Guild} guild The guild to check
	 * @param {...String} perms The permissions to check for
	 * @returns {boolean}
	 */
	hasPermissions(guild, ...perms) {
		const clientMember = guild.members.get(this.client.user.id);
		for (const perm of perms) {
			if (!clientMember.permission.has(perm)) return false;
		}

		return true;
	}

	/**
	 * Check if the client user has a high enough role
	 * @param {Guild} guild Guild object
	 * @param {Role} role Role object
	 * @return {Boolean}
	 */
	hasRoleHierarchy(guild, role) {
		if (!guild) return false;

		const clientMember = guild.members.get(this.client.user.id);

		if (!clientMember) return false;

		for (let r of clientMember.roles) {
			r = guild.roles.get(r);
			if (r.id === role.id) continue;
			if (r.position > role.position) return true;
		}

		return false;
	}

	regionEnabled(guild) {
		return utils.regionEnabled(guild, config);
	}

	/**
	 * Passthrough method to check if user is admin
	 * @param {User|Member} user User object
	 * @returns {Boolean}
	 */
	isAdmin(user) {
		return this.dyno.permissions.isAdmin(user);
	}

	/**
	 * Passthrough method to check if user is overseer
	 * @param {User|Member} user User Object
	 * @return {Boolean}
	 */
	isOverseer(user) {
		return this.dyno.permissions.isOverseer(user);
	}

	/**
	 * Passthrough method to check if user is server admin
	 * @param {Member} member  Guild member object
	 * @param {Channel} channel Channel object
	 * @returns {Boolean}
	 */
	isServerAdmin(member, channel) {
		return this.dyno.permissions.isServerAdmin(member, channel);
	}

	/**
	 * Passthrough method to check if user is server mod
	 * @param {Member} member  Guild member object
	 * @param {Channel} channel Channel object
	 * @returns {Boolean}
	 */
	isServerMod(member, channel) {
		return this.dyno.permissions.isServerMod(member, channel);
	}

	/**
	 * Get voice channel for a member
	 * @param {Member} member Member object
	 * @returns {GuildChannel|null}
	 */
	getVoiceChannel(member) {
		if (!member.voiceState || !member.voiceState.channelID) {
			return null;
		}
		return this.client.getChannel(member.voiceState.channelID);
	}

	async getStreamCount() {
		try {
			var vcs = await redis.hgetallAsync(`dyno:vc:${this.config.client.id}`);
		} catch (err) {
			this.logger.error(err);
			return this.config.maxStreamLimit;
		}

		let streamCount = Object.values(vcs).reduce((a, b) => { a += parseInt(b); return a; }, 0);
		return streamCount;
	}

	/**
	 * Resolve username/id/mention
	 * @param {Guild} guild Guild object
	 * @param {String} user User id, name or mention
	 * @param {Array} [context] An array of users ids to search instead of guild.members
	 * @returns {Member|User|null} Resolved member, user or null
	 */
	resolveUser(guild, user, context, exact) {
		return Resolver.user(guild, user, context, exact);
	}

	/**
	 * Resolve role name/id/mention
	 * @param {Guild} guild Guild object
	 * @param {String} role Role id, name or mention
	 * @returns {Role|null} Resolved role or null
	 */
	resolveRole(guild, role) {
		return Resolver.role(guild, role);
	}

	/**
	 * Resolve channel name/id/mention
	 * @param {Guild} guild   Guild object
	 * @param {String} channel Role id, name or mention
	 * @return {Channel|null} Resolved channel or null
	 */
	resolveChannel(guild, channel) {
		return Resolver.channel(guild, channel);
	}

	/**
	 * Create a role
	 * @param {Guild} guild Guild to create the role in
	 * @param {Object} options Options passed to role.edit
	 * @returns {Promise}
	 */
	createRole(guild, options) {
		return Role.createRole(guild, options);
	}

	/**
	 * Attempt to send a DM to guild owner
	 * @param {Guild} guild Guild object
	 * @param {String} content Message to send
	 * @returns {Promise}
	 */
	sendDM(userId, content) {
		statsd.increment(`messages.dm`);
		return new Promise((resolve, reject) =>
			this.client.getDMChannel(userId)
				.catch(reject)
				.then(channel => {
					if (!channel) return reject('Channel is undefined or null.');
					return this.sendMessage(channel, content).catch(() => false);
				}));
	}

	/**
	 * Send message wrapper
	 * @param {GuildChannel} channel Channel object
	 * @param {String|Array|Object} content Message to send
	 * @param {Object} [options] Send message options
	 * @returns {Promise} Pass promise from channel.sendMessage()
	 */
	sendMessage(channel, content, options) {
		if (this.suppressOutput) return Promise.resolve();
		statsd.increment(`messages.sent`);
		if (this.responseChannel) {
			return utils.sendMessage(this.responseChannel, content, options);
		}
		return utils.sendMessage(channel, content, options);
	}

	executeWebhook(webhook, options) {
		statsd.increment(`messages.webhook`);
		if (!webhook || !webhook.id || !webhook.token) {
			this.logger.error('Missing webhook');
			return Promise.reject('Missing webhook.');
		}
		if (options.slack) {
			delete options.slack;
			return this.client.executeSlackWebhook(webhook.id, webhook.token, options);
		}
		return this.client.executeWebhook(webhook.id, webhook.token, options);
	}

	async sendWebhook(channel, options, guildConfig) {
		options.avatarURL = options.avatarURL ||
			`https://cdn.discordapp.com/avatars/${this.dyno.user.id}/${this.dyno.user.avatar}.jpg`;

		let payload = Object.assign({}, this.dyno.webhooks.default);
		payload = Object.assign(payload, options || {});
		payload.wait = true;

		if (guildConfig && guildConfig.webhooks && guildConfig.webhooks[channel.id]) {
			return this.executeWebhook(guildConfig.webhooks[channel.id], payload);
		}

		try {
			var webhook = await this.dyno.webhooks.getOrCreate(channel);
		} catch (err) {
			return Promise.reject(err);
		}

		if (webhook) {
			guildConfig.webhooks = guildConfig.webhooks || {};
			guildConfig.webhooks[channel.id] = webhook;
			this.dyno.guilds.update({ _id: channel.guild.id }, { $set: { webhooks: guildConfig.webhooks } }).catch(() => false);
		}

		return this.executeWebhook(webhook, payload);
	}

	/**
	 * Send codeblock
	 * @param {GuildChannel} channel Channel object
	 * @param {String|Array} content  Message to send
	 * @param {String} [lang=''] Language to highlight
	 * @param {...*} [args] Optional sendMessage arguments
	 * @returns {Promise}
	 */
	sendCode(channel, content, lang = '', ...args) {
		return this.sendMessage(channel, '```' + `${lang}\n${content}` + '```', ...args);
	}

	/**
	 * Reply to the user by mentioning them
	 * @param {Message} message Message object
	 * @param {String} content Message to send
	 * @param {...*} args Additional options to pass sendMessage
	 * @returns {Promise}
	 */
	reply(message, content, ...args) {
		return this.sendMessage(message.channel, `${message.author.mention} ${content}`, ...args);
	}

	/**
	 * Send message wrapper that prefixes a success emoji defined in config
	 * @param {GuildChannel} channel Channel object
	 * @param {String} content Message to send
	 * @param {...*} args Additioonal options to pass to sendMessage
	 * @returns {Promise}
	 */
	success(channel, content, ...args) {
		return this.sendMessage(channel, `${this.config.emojis.success} ${content}`, ...args);
	}

	/**
	 * Send message wrapper that prefixes an error emoji defined in config
	 * @param {GuildChannel} channel Channel object
	 * @param {String} content  Message to send
	 * @param {Error} [err] Optional error object to pass
	 * @returns {Promise} Promise returned from sendMessage
	 */
	error(channel, content, err) {
		return new Promise((resolve, reject) =>
			this.sendMessage(channel, `${this.config.emojis.error} ${content}`)
				.catch(err => err)
				.then(() => reject(err || content)));
	}

	info(message) {
		const module = typeof this.module === 'object' ? this.module.name : this.module || this.constructor.name;
		return logger.info(`[${module}]: ${message}`);
	}

	debug(message) {
		const module = typeof this.module === 'object' ? this.module.name : this.module || this.constructor.name;
		return logger.debug(`[${module}]: ${message}`);
	}

	warn(message) {
		const module = typeof this.module === 'object' ? this.module.name : this.module || this.constructor.name;
		return logger.warn(`[${module}]: ${message}`);
	}
}

module.exports = Base;

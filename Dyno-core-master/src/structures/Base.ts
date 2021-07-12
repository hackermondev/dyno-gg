import * as eris from '@dyno.gg/eris';
import axios from 'axios';
import Resolver from '../utils/Resolver';
import Command from './Command';
import Module from './Module';
import Role from './Role';
import WebhookConfig from './WebhookConfig';
import WebhookOptions from './WebhookOptions';

interface Base {
	suppressOutput?: boolean;
	responseChannel?: eris.TextChannel;
}

/**
 * @class Base
 */
class Base {
	public guild: eris.Guild;
	public module: string|Module;
	private _dyno: any;

	constructor(dyno: any, guild?: eris.Guild) {
		this._dyno = dyno;

		if (guild) {
			this.guild = guild;
		}
	}

	public toJSON(): object {
		const copy: {[key: string]: any} = {};

		for (const key in this) {
			if (!this.hasOwnProperty(key) || key.startsWith('_')) {
				continue;
			}

			if (!this[key]) {
				copy[key] = this[key];
			} else if (<any>this[key] instanceof Set) {
				copy[key] = Array.from(<any>this[key]);
			} else if (<any>this[key] instanceof Map) {
				copy[key] = Array.from((<any>this[key]).values());
			} else if ((<any>this[key]).toJSON != undefined) {
				copy[key] = (<any>this[key]).toJSON();
			} else {
				copy[key] = this[key];
			}
		}

		return copy;
	}

	public inspect(): object {
		return this.toJSON();
	}

	/**
	 * Dyno instance
	 */
	public get dyno() {
		return this._dyno;
	}

	/**
	 * Eris client instance
	 */
	public get client() {
		return this.dyno.client;
	}

	/**
	 * Eris rest client instance
	 */
	public get restClient() {
		return this.dyno.restClient;
	}

	/**
	 * SnowTransfer client instance
	 */
	public get snowClient() {
		return this.dyno.snowClient;
	}

	/**
	 * Cluster data
	 */
	public get cluster() {
		return this.dyno.options;
	}

	/**
	 * Dyno configuration
	 */
	public get config() {
		return this.dyno.config;
	}

	/**
	 * Dyno global configuration
	 */
	public get globalConfig() {
		return this.dyno.globalConfig;
	}

	/**
	 * Logger instance
	 */
	public get logger() {
		return this.dyno.logger;
	}

	/**
	 * IPCManager instance
	 */
	public get ipc() {
		return this.dyno.ipc;
	}

	/**
	 * WebhookManager instance
	 */
	public get webhooks() {
		return this.dyno.webhooks;
	}

	/**
	 * PermissionsManager instance
	 */
	public get permissionsManager() {
		return this.dyno.permissions;
	}

	/**
	 * Dyno data models
	 */
	public get models() {
		return this.dyno.models;
	}

	/**
	 * Datafactory DB instance
	 */
	public get db() {
		return this.dyno.db;
	}

	/**
	 * Redis connection instance
	 */
	public get redis() {
		return this.dyno.redis;
	}

	/**
	 * Statsd client instance
	 */
	public get statsd() {
		return this.dyno.statsd;
	}

	/**
	 * Prometheus client
	 */
	public get prom() {
		return this.dyno.prom;
	}

	/**
	 * Helper methods provided to commands and modules
	 */
	public get utils() {
		return this.dyno.utils;
	}

	get langs() {
		return this._dyno.langs;
	}

	public getConfig(guildId: string): Promise<any> {
		return this.dyno.guilds.fetch(guildId);
	}

	public getCachedConfig(guildId: string): Promise<any> {
		return this.dyno.guilds.getOrFetch(guildId);
	}

	public getCommand(name: string): Command {
		return this.dyno.commands.get(name);
	}

	public getModule(name: string): Module {
		return this.dyno.modules.get(name);
	}

	public t(guildConfig: any, key: string, values: any) {
		let locale;
		if (typeof guildConfig === 'string') {
			locale = guildConfig;
		} else {
			locale = guildConfig.locale || 'en';
		}
		return this.langs.t(locale, key, values);
	}

	/**
	 * Check if the bot has permissions
	 */
	public hasPermissions(guild: eris.Guild, ...perms: string[]): boolean {
		const clientMember = guild.members.get(this.client.user.id);
		for (const perm of perms) {
			if (!clientMember.permission.has(perm)) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Get a list of missing permissions
	 */
	public missingPermissions(guild: eris.Guild, ...perms: string[]): string[] {
		const clientMember = guild.members.get(this.client.user.id);
		const missingPermissions = [];

		for (const perm of perms) {
			if (!clientMember.permission.has(perm)) {
				missingPermissions.push(perm);
			}
		}
		return missingPermissions.length > 0 ? missingPermissions : null;
	}

	/**
	 * Check if the bot has permissions in a channel
	 */
	public hasChannelPermissions(guild: eris.Guild, channel: eris.GuildChannel, ...perms: string[]): boolean {
		for (const perm of perms) {
			if (!channel.permissionsOf(this.client.user.id).has(perm)) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Get a list of missing permissions in a channel
	 */
	public missingChannelPermissions(guild: eris.Guild, channel: eris.GuildChannel, ...perms: string[]): string[] {
		const missingPermissions = [];
		for (const perm of perms) {
			if (!channel.permissionsOf(this.client.user.id).has(perm)) {
				missingPermissions.push(perm);
			}
		}
		return missingPermissions.length > 0 ? missingPermissions : null;
	}

	/**
	 * Check if the client user has a high enough role
	 */
	public hasRoleHierarchy(guild: eris.Guild, role: eris.Role): boolean {
		if (!guild) {
			return false;
		}

		const clientMember = guild.members.get(this.client.user.id);

		if (!clientMember) {
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

	public regionEnabled(guild: eris.Guild): boolean {
		return this.utils.regionEnabled(guild, this.config);
	}

	/**
	 * Passthrough method to check if user is admin
	 */
	public isAdmin(user: eris.Member|eris.User): boolean {
		return this.dyno.permissions.isAdmin(user);
	}

	/**
	 * Passthrough method to check if user is overseer
	 */
	public isOverseer(user: eris.Member|eris.User): boolean {
		return this.dyno.permissions.isOverseer(user);
	}

	/**
	 * Passthrough method to check if user is server admin
	 */
	public isServerAdmin(member: eris.Member, channel: eris.Channel): boolean {
		return this.dyno.permissions.isServerAdmin(member, channel);
	}

	/**
	 * Passthrough method to check if user is server mod
	 */
	public isServerMod(member: eris.Member, channel: eris.Channel): boolean {
		return this.dyno.permissions.isServerMod(member, channel);
	}

	/**
	 * Get voice channel for a member
	 */
	public getVoiceChannel(member: eris.Member): eris.Channel {
		if (!member.voiceState || !member.voiceState.channelID) {
			return null;
		}
		return this.client.getChannel(member.voiceState.channelID);
	}

	public async getStreamCount(): Promise<number> {
		let vcs;
		try {
			vcs = await this.redis.hgetallAsync(`dyno:vc:${this.config.client.id}`);
		} catch (err) {
			this.logger.error(err);
			return this.config.maxStreamLimit;
		}

		return <number>Object.values(vcs).reduce((a: number, b: string) => { a += parseInt(b, 10); return a; }, 0);
	}

	/**
	 * Resolve username/id/mention
	 */
	public resolveUser(guild: eris.Guild, user: string, context?: any[], exact?: boolean): eris.Member | eris.User {
		return Resolver.user(guild, user, context, exact);
	}

	/**
	 * Resolve role name/id/mention
	 */
	public resolveRole(guild: eris.Guild, role: string): eris.Role {
		return Resolver.role(guild, role);
	}

	/**
	 * Resolve channel name/id/mention
	 */
	public resolveChannel(guild: eris.Guild, channel: string): eris.GuildChannel {
		return Resolver.channel(guild, channel);
	}

	/**
	 * Create a role
	 */
	public createRole(guild: eris.Guild, options: any): Promise<any> {
		const role = new Role(this.dyno, guild);
		return role.createRole(options);
	}

	/**
	 * Get or create a channel webhook
	 */
	public async getOrCreateWebhook(channel: eris.TextChannel): Promise<eris.Webhook> {
		const id = (typeof channel === 'string') ? channel : channel.id || null;
		if (!id) {
			return Promise.reject(`Invalid channel or id.`);
		}

		const avatarURL = `${this.config.site.host}/${this.config.avatar}?r=${this.config.version}`;

		try {
			const webhooks = await this.client.getChannelWebhooks(channel.id);

			if (!webhooks || !webhooks.length) {
				const res = await axios.get(avatarURL, {
					headers: { Accept: 'image/*' },
					responseType: 'arraybuffer',
				}).then((response: any) => `data:${response.headers['content-type']};base64,${response.data.toString('base64')}`);

				const wh = await this.client.createChannelWebhook(channel.id, {
					name: 'Dyno',
					avatar: res,
				});

				return Promise.resolve(wh);
			}

			const webhook = webhooks.find((hook: any) => hook.name === 'Dyno');
			if (webhook) {
				return Promise.resolve(webhook);
			}

			return Promise.resolve(webhooks[0]);
		} catch (err) {
			return Promise.reject(err);
		}
	}

	/**
	 * Attempt to send a DM to a user
	 */
	public sendDM(userId: string, content: eris.MessageContent): Promise<eris.Message> {
		this.dyno.prom.register.getSingleMetric('dyno_app_messages_sent').inc({ type: 'dm' });
		return new Promise((resolve: Function, reject: Function) =>
			this.client.getDMChannel(userId)
				.catch(reject)
				.then((channel: eris.PrivateChannel) => {
					if (!channel) {
						return reject('Channel is undefined or null.');
					}
					return this.sendMessage(channel, content).catch(() => false);
				}));
	}

	/**
	 * Send message wrapper
	 */
	public sendMessage(channel: eris.Channel|eris.GuildChannel, content: eris.MessageContent, options?: any): Promise<eris.Message> {
		if (this.suppressOutput) {
			return Promise.resolve(null);
		}
		this.dyno.prom.register.getSingleMetric('dyno_app_messages_sent').inc({ type: 'normal' });
		if (this.responseChannel) {
			return this.utils.sendMessage(this.responseChannel, content, options);
		}
		return this.utils.sendMessage(channel, content, options);
	}

	/**
	 * Execute a webhook
	 */
	public executeWebhook(webhook: WebhookConfig, options: WebhookOptions): Promise<{}> {
		this.dyno.prom.register.getSingleMetric('dyno_app_messages_sent').inc({ type: 'webhook' });
		if (options.slack) {
			delete options.slack;
			return this.client.executeSlackWebhook(webhook.id, webhook.token, options);
		}
		return this.client.executeWebhook(webhook.id, webhook.token, options);
	}

	/**
	 * Send a channel webhook
	 */
	public async sendWebhook(channel: eris.TextChannel, options: WebhookOptions, guildConfig: any): Promise<{}> {
		options.avatarURL = options.avatarURL ||
			`https://cdn.discordapp.com/avatars/${this.dyno.user.id}/${this.dyno.user.avatar}.jpg`;

		const avatarURL = `${this.config.site.host}/${this.config.avatar}?r=${this.config.version}`;

		let payload: any = {
			username: 'Dyno',
			avatarURL: avatarURL,
			tts: false,
			wait: true,
		};

		payload = {
			...payload,
			...(options || {}),
		};

		if (guildConfig && guildConfig.webhooks && guildConfig.webhooks[channel.id]) {
			return this.executeWebhook(guildConfig.webhooks[channel.id], payload);
		}

		let webhook;

		try {
			webhook = await this.dyno.webhooks.getOrCreate(channel);
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
	 */
	public sendCode(channel: eris.Channel, content: string, ...args: any[]): Promise<{}> {
		return this.utils.sendCode(channel, content, ...args);
	}

	/**
	 * Reply to the user by mentioning them
	 */
	public reply(message: eris.Message, content: string, ...args: any[]): Promise<{}> {
		return this.sendMessage(message.channel, `${message.author.mention} ${content}`, ...args);
	}

	/**
	 * Send message wrapper that prefixes a success emoji defined in config
	 */
	public success(channel: eris.Channel, content: string, ...args: any[]): Promise<{}> {
		const embed = {
			color: this.utils.getColor('green'),
			description: `${this.config.emojis.success} ${content}`,
		};

		return this.sendMessage(channel, { embed }, ...args);
	}

	public info(channel: eris.Channel, content: string, ...args: any[]): Promise<{}> {
		const embed = {
			color: this.utils.getColor('blue'),
			description: `${this.config.emojis.info} ${content}`,
		};

		return this.sendMessage(channel, { embed }, ...args);
	}

	/**
	 * Send message wrapper that prefixes an error emoji defined in config
	 * @param {GuildChannel} channel Channel object
	 * @param {String} content  Message to send
	 * @param {Error} [err] Optional error object to pass
	 * @returns {Promise} Promise returned from sendMessage
	 */
	public error(channel: eris.Channel, content: string, err?: Error) {
		const embed = {
			color: this.utils.getColor('red'),
			description: `${this.config.emojis.error} ${content}`,
		};

		return new Promise((resolve: Function, reject: Function) =>
			this.sendMessage(channel, { embed })
				.catch((e: Error) => e)
				.then(() => reject(err || content)));
	}

	public debug(message: string): void {
		const module = typeof this.module === 'object' ? this.module.name : this.module || this.constructor.name;
		this.logger.debug(`[${module}]: ${message}`);
	}

	public warn(message: string): void {
		const module = typeof this.module === 'object' ? this.module.name : this.module || this.constructor.name;
		this.logger.warn(`[${module}]: ${message}`);
	}

	public logError(err: string, type: string = 'module.error') {
		const meta = {
			type: type,
			guild: null,
			shard: null,
			cluster: this.cluster.clusterId,
		};

		if (this.guild != undefined) {
			meta.guild = this.guild.id;
			meta.shard = this.guild.shard.id;
		}

		this.logger.error(err, meta);
	}
}

export default Base;

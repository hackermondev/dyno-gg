import {Base, Module} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as dyno from 'Dyno';

export default class Event extends Base {
	public module: Module;
	private permCooldowns: Map<string, number>;

	constructor(dynoInstance: dyno.Dyno, module: Module) {
		super(dynoInstance);
		this.module = module;
	}

	/**
	 * Determine if an event should be logged
	 */
	public shouldLog(e: any): Promise<eris.GuildChannel> {
		if (!e.guild || !e.guild.id) {
			return Promise.resolve(null);
		}
		const { event, guild, channel, guildConfig } = e;

		// attempt to get guild config if not provided by the event
		if (!guildConfig) {
			return new Promise((resolve: Function) => {
				this.dyno.guilds.getOrFetch(guild.id).then((config: dyno.GuildConfig) => {
					if (!config) {
						return resolve(null);
					}
					if (!this.module.isEnabled(guild, this.module, config)) {
						return resolve(null);
					}

					e.guildConfig = config;

					return this.shouldLog(e);
				}).catch(() => resolve(null));
			});
		}

		if (!this.module.isEnabled(guild, this.module, guildConfig)) {
			return Promise.resolve(null);
		}

		if (!guildConfig.actionlog || !guildConfig.actionlog.channel)  {
			return Promise.resolve(null);
		}

		if (!guildConfig.actionlog[event]) {
			return Promise.resolve(null);
		}

		if (channel && guildConfig.actionlog.ignoredChannels && guildConfig.actionlog.ignoredChannels.length) {
			if (guildConfig.actionlog.ignoredChannels.find((c: any) => c.id === channel.id)) {
				return Promise.resolve(null);
			}
		}

		return Promise.resolve(this.client.getChannel(guildConfig.actionlog.channel));
	}

	/**
	 * Log an event to a channel
	 */
	public logEvent(channel: eris.AnyGuildChannel, embed: eris.EmbedBase, guildConfig: dyno.GuildConfig): Promise<any> {
		if (this.config.isPremium && guildConfig.isPremium) {
			return this.sendMessage((<eris.GuildChannel>channel), { embed });
		}

		if (!this.hasPermissions(channel.guild, 'manageWebhooks')) {
			let skip = false;

			if (this.permCooldowns && this.permCooldowns.has(channel.guild.id)) {
				if ((Date.now() - this.permCooldowns.get(channel.guild.id)) < 60000) {
					skip = true;
				}
			}

			if (!skip) {
				const warning = [
					`:warning: **Missing Permissions**\n`,
					`Due to a necessary change for performance, I need __Manage Webhooks__ permissions to send logs.`,
					`Once the permission is enabled, logs can continue.`,
				];

				this.permCooldowns = this.permCooldowns || new Map();
				this.permCooldowns.set(channel.guild.id, Date.now());

				return this.sendMessage((<eris.GuildChannel>channel), warning.join('\n'));
			}

			return Promise.resolve();
		}

		return this.sendWebhook((<eris.TextChannel>channel), { embeds: [embed] }, guildConfig)
			.then(() => {
				if (guildConfig && guildConfig.missingWebhooks) {
					delete guildConfig.missingWebhooks;
					this.dyno.guilds.update(channel.guild.id, { $unset: { missingWebhooks: 1 } }).catch(() => false);
				}
			})
			.catch(() => {
				if (guildConfig && !guildConfig.missingWebhooks) {
					guildConfig.missingWebhooks = 1;
					this.dyno.guilds.update(channel.guild.id, { $set: { missingWebhooks: 1 } }).catch(() => false);
				}
				this.sendMessage((<eris.GuildChannel>channel), { embed });
				return Promise.resolve();
			});
	}
}

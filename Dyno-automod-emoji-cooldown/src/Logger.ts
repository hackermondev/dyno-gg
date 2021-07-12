import { Base } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import { ModUtils } from '@dyno.gg/moderation';
import * as each from 'async-each';
import * as dyno from 'Dyno';
import Automod from './Automod';

export default class Logger extends Base {
	public module: Automod;
	private infractions: Map<string, Infraction>;
	private moderation: ModUtils;
	private permCooldowns: Map<string, number> = new Map();

	constructor(module: Automod) {
		super(module.dyno);
		this.module = module;
		this.infractions = this.module.infractions;
		this.moderation = module.moderation;
	}

	/**
	 * Log deleted message or ban
	 * @param {Message} message Message object
	 * @param {String} msgContent Message content
	 * @param {String} reason Reason for deleting/banning
	 * @param {String} [action] Optional action taken against the user
	 * @returns {Promise|null} False or Promise
	 */
	// tslint:disable-next-line:cyclomatic-complexity
	public log(e: LogEvent) {
		const { message, filter, guildConfig, action } = e;

		const modConfig = guildConfig.automod || {};
		const modlog = this.client.getChannel(modConfig.channel);
		const autoMute = modConfig.muteAfter || filter.automute;
		let infraction = e.infraction;
		let muted;

		if (filter.automute && !infraction) {
			infraction = 2;
		}

		// update infractions
		if (infraction && !action) {
			let infractions = this.infractions.get(`${message.channel.guild.id}${message.author.id}`);

			if (infractions) {
				infractions.count = infractions.count || 0;
				infractions.count++;

				if ((Date.now() - infractions.createdAt) <= 30000 && infractions.count >= 10) {
					muted = true;
					this.handleInfractions(e, infractions);
				}
			} else {
				infractions = {
					guild: message.channel.guild,
					user: message.author,
					count: 1,
					createdAt: Date.now(),
				};

				this.infractions.set(`${message.channel.guild.id}${message.author.id}`, infractions);
			}

			if (!muted && autoMute) {
				const muteCount = modConfig.muteCount || filter.muteCount || 3;

				if (modConfig.muteAfter && infractions.count >= muteCount) {
					const reason = `${infractions.count} automod violations`;

					this.module.moderator.mute(message, guildConfig, null, reason)
						.catch(() => false)
						.then(() => {
							this.log({
								message: message,
								reason: reason,
								action: 'muted',
								guildConfig,
								filter,
							});

							this.moderation.log({
								type: 'Mute [Auto]',
								user: message.author,
								guild: message.guild,
								limit: filter.muteTime || modConfig.muteTime || 10,
								guildConfig,
								reason,
							});

							this.infractions.delete(`${message.channel.guild.id}${message.author.id}`);
							this.statsd.increment(`automod.mute`);
							this.redis.hincrby('automod.counts', 'mutes', 1);
						});
				}
			}
		}

		if (!action) {
			this.statsd.increment(`automod.${e.type}`);
			this.redis.multi()
				.hincrby('automod.counts', 'any', 1)
				.hincrby('automod.counts', e.type, 1)
				.exec();

			const doc = new this.models.AutomodLog({
				guild: message.guild.id,
				user: message.author.toJSON(),
				type: e.type,
				message: message.toJSON(),
				reason: e.reason,
			});

			doc.save();
		}

		if (!modlog) {
			if (!e.modlog) { return; }
			this.moderation.log({
				type: 'Mute [Auto]',
				user: message.author,
				guild: message.guild,
				limit: filter.muteTime || modConfig.muteTime || 10,
				reason: e.reason,
				guildConfig: guildConfig,
			});
		}

		return this.createModlog(e, modlog);
	}

	public handleInfractions(e: LogEvent, infraction: Infraction) {
		const { message, guildConfig, filter } = e;
		const reason = `${infraction.count} automod violations in 30s`;

		this.module.moderator.mute(message, guildConfig, 10, reason)
			.catch(() => false)
			.then(() => {
				this.log({ message, guildConfig, filter, reason, action: 'muted' });

				this.moderation.log({
					type: 'Mute [Auto]',
					user: message.author,
					guild: message.guild,
					limit: 10,
					guildConfig,
					reason,
				});

				this.infractions.delete(`${message.channel.guild.id}${message.author.id}`);
				this.statsd.increment(`automod.forcemute`);
				this.redis.hincrby('automod.counts', 'forcemutes', 1);
			});
	}

	public createModlog(e: LogEvent, modlog: any) {
		const { message, guildConfig, msgContent, reason, action } = e;

		let title = `**Message sent by ${message.author.mention} deleted in ${message.channel.mention}**`;

		if (action) {
			switch (action) {
				case 'banned':
					title = `**Banned ${message.author.mention}**`;
					break;
				case 'muted':
					title = `**Muted ${message.author.mention}**`;
					break;
				default:
					break;
			}
		}

		const embed = {
			color: this.utils.getColor('orange'),
			author: {
				name: this.utils.fullName(message.author, false),
				icon_url: message.author.avatarURL || null,
			},
			description: title,
			fields: [
				{ name: 'Reason', value: reason },
			],
			footer: { text: `ID: ${message.author.id}` },
			timestamp: (new Date()).toISOString(),
		};

		if (msgContent && msgContent.length) {
			embed.description += '\n';
			embed.description += msgContent.length > 255 ?
				`${msgContent.substr(0, 252)}...` :
				msgContent;
		}

		if (this.config.isPremium && guildConfig.isPremium) {
			return this.sendMessage(modlog, { embed: embed });
		}

		if (!this.hasPermissions(message.channel.guild, 'manageWebhooks')) {
			let skip = false;

			if (this.permCooldowns.has(message.guild.id)) {
				if ((Date.now() - this.permCooldowns.get(message.guild.id)) < 60000) {
					skip = true;
				}
			}

			if (!skip) {
				const warning = [
					`:warning: **Missing Permissions**\n`,
					`Due to a necessary change for performance, I need __Manage Webhooks__ permissions to send logs.`,
					`Once the permission is enabled, logs can continue.`,
				];

				this.permCooldowns.set(message.guild.id, Date.now());

				return this.sendMessage(modlog, warning.join('\n'));
			}

			return;
		}

		return this.sendWebhook(modlog, { embeds: [embed] }, guildConfig)
			.then(() => {
				if (guildConfig && guildConfig.missingWebhooks) {
					delete guildConfig.missingWebhooks;
					this.dyno.guilds.update(message.guild.id, { $unset: { missingWebhooks: 1 } }).catch(() => false);
				}
			})
			.catch(() => {
				if (guildConfig && !guildConfig.missingWebhooks) {
					guildConfig.missingWebhooks = 1;
					this.dyno.guilds.update(message.guild.id, { $set: { missingWebhooks: 1 } }).catch(() => false);
				}
				this.sendMessage(modlog, { embed });
				return false;
			});
	}

	protected formatMessage(message: eris.Message) {
		return {
			id: message.id,
			type: message.type,
			channel: (<eris.GuildChannel>message.channel).name,
			channelID: message.channel.id,
			content: message.content,
			cleanContent: message.cleanContent,
			timestamp: message.timestamp,
			author: Object.assign(message.author.toJSON(), { avatarURL: message.author.avatarURL }),
		};
	}

	protected formatGuild(guild: eris.Guild) {
		return {
			id: guild.id,
			name: guild.name,
			icon: guild.iconURL,
			shard: guild.shard.id,
		};
	}
}

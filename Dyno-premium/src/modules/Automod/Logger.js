'use strict';

const Base = Loader.require('./core/structures/Base');
const utils = Loader.require('./core/utils');
const redis = require('../../core/redis');
const statsd = require('../../core/statsd');

class Logger extends Base {
	constructor(module) {
		super();
		this.module = module;
		this.infractions = this.module.infractions;
		this.moderation = module.moderation;

		this.mutes = new Set();
		this.globalLogs = [];
		this.sendGlobal = this.debounce(this._sendGlobal.bind(this), 250);
	}

	broadcast(e) {
		this.ipc.send('broadcast', {
			op: 'automod',
			d: e,
		});
	}

	formatMessage(message) {
		return {
			id: message.id,
			type: message.type,
			channel: message.channel.name,
			channelID: message.channel.id,
			content: message.content,
			cleanContent: message.cleanContent,
			timestamp: message.timestamp,
			author: Object.assign(message.author.toJSON(), { avatarURL: message.author.avatarURL }),
		};
	}

	formatGuild(guild) {
		return {
			id: guild.id,
			name: guild.name,
			icon: guild.iconURL,
			shard: guild.shard.id,
		};
	}

	/**
	 * Log deleted message or ban
	 * @param {Message} message Message object
	 * @param {String} msgContent Message content
	 * @param {String} reason Reason for deleting/banning
	 * @param {String} [action] Optional action taken against the user
	 * @returns {Promise|null} False or Promise
	 */
	log(e) {
		const { message, guildConfig, msgContent, reason, action, infraction } = e;

		this.broadcast({
			guild: this.formatGuild(message.channel.guild),
			message: this.formatMessage(message),
			msgContent,
			reason,
			action,
			infraction,
		});

		if (!guildConfig) return;

		const modConfig = guildConfig.automod || {},
			modlog = this.client.getChannel(modConfig.channel);

		// update infractions if banAfter is set
		if (infraction && !action) {
			let infractions = this.infractions.get(`${message.channel.guild.id}${message.author.id}`);

			if (infractions) {
				infractions.count = infractions.count || 0;
				infractions.count++;

				if ((Date.now() - infractions.createdAt) <= 30000 && infractions.count >= 10) {
					var muted = true;

					let reason = `${infractions.count} automod violations in 30s`;

					this.module.moderator.mute(message, guildConfig, 10, reason)
						.catch(() => false)
						.then(() => {
							this.log({ message, reason, action: 'muted' });

							this.moderation.log({
								type: 'Mute [Auto]',
								user: message.author,
								guild: message.guild,
								limit: 10,
								reason: reason,
								guildConfig,
							});

							this.infractions.delete(`${message.channel.guild.id}${message.author.id}`);
							statsd.increment(`automod.forcemute`);
							redis.hincrby('automod.counts', 'forcemutes', 1);
						});
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

			if (!muted && (modConfig.banAfter || modConfig.muteAfter)) {
				let muteCount = modConfig.muteCount || 3;

				if (modConfig.muteAfter && infractions.count >= muteCount) {
					let reason = `${infractions.count} automod violations`;

					this.module.moderator.mute(message, guildConfig, null, reason)
						.catch(() => false)
						.finally(() => {
							this.log({
								message: message,
								reason: reason,
								action: 'muted',
								guildConfig: guildConfig,
							});

							this.moderation.log({
								type: 'Mute [Auto]',
								user: message.author,
								guild: message.guild,
								limit: modConfig.muteTime || 10,
								reason: reason,
								guildConfig: guildConfig,
							});

							this.infractions.delete(`${message.channel.guild.id}${message.author.id}`);
							statsd.increment(`automod.mute`);
							redis.hincrby('automod.counts', 'mutes', 1);
						});
				}

				if (modConfig.banAfter && infractions.count >= modConfig.banAfter) {
					// this.log({ message, msgContent, reason });
					let reason = `${infractions.count} automod violations`;

					this.log({
						message: message,
						reason: reason,
						action: 'banned',
						guildConfig: guildConfig,
					});

					this.moderation.log({
						type: 'Ban [Auto]',
						user: message.author,
						guild: message.guild,
						reason: reason,
						guildConfig: guildConfig,
					});

					this.infractions.delete(`${message.channel.guild.id}${message.author.id}`);
					return this.client.banGuildMember(message.channel.guild.id, message.author.id, 7, encodeURIComponent(reason));
				}
			}
		}

		if (!action) {
			statsd.increment(`automod.${e.type}`);
			redis.multi()
				.hincrby('automod.counts', 'any', 1)
				.hincrby('automod.counts', e.type, 1)
				.exec();
		}

		if (!modlog) return;

		let title = `**Message sent by ${message.author.mention} deleted in ${message.channel.mention}**`;

		if (action) {
			switch (action) {
				case 'banned':
					title = `**Banned ${message.author.mention}**`;
					break;
				case 'muted':
					title = `**Muted ${message.author.mention}**`;
					break;
			}
		}

		const embed = {
			color: utils.getColor('orange'),
			author: {
				name: utils.fullName(message.author, false),
				icon_url: message.author.avatarURL || null,
			},
			description: title,
			fields: [
				{ name: 'Reason', value: reason },
			],
			footer: { text: `ID: ${message.author.id}` },
			timestamp: new Date(),
		};

		if (msgContent && msgContent.length) {
			embed.description += '\n';
			embed.description += msgContent.length > 255 ?
				msgContent.substr(0, 252) + '...' :
				msgContent;
		}

		if (this.config.isPremium && guildConfig.isPremium) {
			return this.sendMessage(modlog, { embed });
		}

		if (!this.hasPermissions(message.channel.guild, 'manageWebhooks')) {
			let skip = false;

			if (this.permCooldowns && this.permCooldowns.has(message.guild.id)) {
				if ((Date.now() - this.permCooldowns.get(message.guild.id)) < 60000) skip = true;
			}

			if (!skip) {
				let warning = [
					`:warning: **Missing Permissions**\n`,
					`Due to a necessary change for performance, I need __Manage Webhooks__ permissions to send logs.`,
					`Once the permission is enabled, logs can continue.`,
				];

				this.permCooldowns = this.permCooldowns || new Map();
				this.permCooldowns.set(message.guild.id, Date.now());

				return this.sendMessage(modlog, warning);
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

	async global(e) {
		const channel = this.client.getChannel(this.config.automod.logChannel);
		if (!channel) return;

		const { guild, message, msgContent, reason, action } = e;

		let title = `Message sent by ${utils.fullName(message.author, false)} deleted in ${guild.name}#${message.channel}`;

		switch (action) {
			case 'banned':
				title = `Banned ${utils.fullName(message.author, false)} in ${guild.name}`;
				break;
			case 'muted':
				title = `Muted ${utils.fullName(message.author, false)} in ${guild.name}`;
				break;
		}

		const embed = {
			color: utils.getColor('orange'),
			title: title,
			description: `\`Reason: ${reason}\``,
			author: {
				name: utils.fullName(message.author, false),
				icon_url: message.author.avatarURL || null,
			},
			timestamp: new Date(),
			footer: {
				text: `Shard ${guild.shard}, ID: ${guild.id}`,
			},
		};

		if (msgContent && msgContent.length) {
			embed.description += '\n\n';
			embed.description += msgContent.length > 255 ?
				msgContent.substr(0, 252) + '...' :
				msgContent;
		}

		this.globalLogs = this.globalLogs || [];
		this.globalLogs.push(embed);

		if (this.globalLogs.length > 10) {
			this.sendGlobal(channel, embed);
		}

		// return this.sendMessage(channel, { embed });
	}

	_sendGlobal(channel, embed) {
		let logs = this.globalLogs.splice(0, 10);
		return this.dyno.webhooks.execute(channel, {
			embeds: logs,
		}).catch(() => {
			this.sendMessage(channel, { embed });
			return false;
		});
	}

	debounce(func, wait, immediate) {
		var timeout;
		return function() {
			var context = this, args = arguments;
			var later = function() {
				timeout = null;
				if (!immediate) func.apply(context, args);
			};
			var callNow = immediate && !timeout;
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
			if (callNow) func.apply(context, args);
		};
	}
}

module.exports = Logger;

'use strict';

const Base = Loader.require('./core/structures/Base');
const utils = Loader.require('./core/utils');

class Filters extends Base {
	constructor(module) {
		super();

		this.module = module;
		this.moderator = module.moderator;

		this.guildLists = new Map();
		this.guildRegex = new Map();

		this.badwords = this.config.automod.badwords;

		this.delete = (...args) => this.moderator.delete(...args);

		this.badRegex = new RegExp(this.badwords.join('|'), 'gi');
		this.linkRegex = new RegExp(/https?:\/\/[\w\d-_]/, 'gi');
		this.repeatRegex = new RegExp(/\b(\w+)\s+\1\b/, 'gi');
		this.clearRegex = new RegExp(/[\n]{5,}/);
		// this.inviteRegex = new RegExp(/discord.(gg|me)\s?\//, 'gi');
		this.dupRegex = new RegExp(/(.+)\1{9,}/, 'gi');
		this.emojiRegex = new RegExp(/([\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF])/, 'g');

		this.inviteRegex = new RegExp(/discord(?:app.com\/invite|.gg|.me|.io)(?:[\\]+)?\/([a-zA-Z0-9\-]+)/, 'gi');

		this.ratelimits = this.module.rateLimits;
		this.linkCooldowns = this.module.linkCooldowns;
		this.attachCooldowns = this.module.attachCooldowns;
	}

	/**
	 * Handle mass mentions
	 * @param {Object} e Event data
	 */
	mentions(e) {
		const { message, guildConfig } = e,
			modConfig = guildConfig.automod;

		let maxMentions = modConfig.maxMentions || 5;

		// ban mass mentions > 10
		if (modConfig.banMentions && message.mentions && message.mentions.length >= 10) {
			// return message.channel.guild.banMember(message.member.id, 7, `${message.mentions.length} mentions`).then(() => {
			return this.client.banGuildMember(message.channel.guild.id, message.member.id, 7, `${message.mentions.length} mentions`)
				.then(() => {
					this.module.log({
						message: message,
						guildConfig: guildConfig,
						type: 'mentions',
						reason: `${message.mentions.length} mentions`,
						action: 'banned',
				});
			}).catch(() => this.moderator.mute(message, guildConfig, 0)
				.catch(() => false)
				.then(() => {
					this.module.log({
						message: message,
						guildConfig: guildConfig,
						type: 'mentions',
						reason: `${message.mentions.length} mentions`,
						action: 'muted',
					});

					this.module.moderation.log({
						type: 'Mute [Auto]',
						user: message.author,
						guild: message.guild,
						reason: `${message.mentions.length} mentions`,
						guildConfig: guildConfig,
					});
					message.delete();
				}));
		}

		// delete mass mentions > maxMentions if set or 5 default
		if (message.mentions && message.mentions.length >= maxMentions) {
			return this.delete(message).then(() => {
				this.module.log({
					message: message,
					guildConfig: guildConfig,
					type: 'mentionslight',
					reason: `${message.mentions.length} mentions`,
					infraction: 2,
				});
				if (modConfig.warnUser) {
					this.moderator.warnUser(message, 'Do not mass mention users!');
				}
			});
		}
	}

	/**
	 * Handle rate limiting
	 * @param {Object} e Event data
	 */
	ratelimit(e) {
		const { message, guildConfig } = e,
			modConfig = guildConfig.automod;

		const limit = this.ratelimits.get(message.author.id);

		if (limit && limit.createdAt) {
			const diff = Date.now() - limit.createdAt;

			if (diff < 4000 && limit.ids.length >= 5) {
				limit.ids.push(message.id);

				return this.client.deleteMessages(message.channel.id, limit.ids).then(() => {
					const diffSec = diff / 1000;
					this.ratelimits.delete(message.author.id);

					this.module.log({
						message: message,
						guildConfig: guildConfig,
						type: 'ratelimit',
						reason: `Sent ${limit.ids.length} messages in ${diffSec.toFixed(2)}s`,
						infraction: 1,
					});

					if (modConfig.warnUser) {
						this.moderator.warnUser(message, `You're sending messages too quick!`);
					}
				}).catch(() => false);
			} else if (diff > 4000) {
				this.ratelimits.set(message.author.id, {
					createdAt: Date.now(),
					ids: [message.id],
				});
			}

			limit.ids = limit.ids || [];
			limit.ids.push(message.id);
		} else {
			this.ratelimits.set(message.author.id, {
				createdAt: Date.now(),
				ids: [message.id],
			});
		}
	}

	/**
	 * Filter banned words
	 * @param {Object} e Event data
	 */
	words(e) {
		const { message, guildConfig } = e,
			modConfig = guildConfig.automod;

		let guildList = modConfig.badwords || [];

		if (modConfig.disableGlobal && !guildList.length) return;

		if (guildList.length) {
			// get mapped guild list from cache if exists
			if (this.guildLists.has(message.channel.guild.id)) {
				guildList = this.guildLists.get(message.channel.guild.id);
			} else {
				guildList = guildList.map(w => {
					w = utils.regEscape(w);
					return w.replace(/(^\s)/, '(?:^|\\s)').replace(/\s$/, '(?:\\s|$)');
				});

				// cache mapped server list
				this.guildLists.set(message.channel.guild.id, guildList);
			}
		}

		let badRegex;

		// get cached regex if exists
		if (this.guildRegex.has(message.channel.guild.id)) {
			badRegex = this.guildRegex.get(message.channel.guild.id);
		} else {
			// ignore global words if set
			if (modConfig.disableGlobal) {
				badRegex = new RegExp(guildList.filter(w => w.length > 2).join('|'), 'gi');
			} else {
				const badwords = this.config.automod.badwords.concat(guildList);
				badRegex = (badwords !== this.badwords) ? new RegExp(badwords.join('|'), 'gi') : this.badRegex;
			}

			// cache the regex
			this.guildRegex.set(message.channel.guild.id, badRegex);
		}

		if (badRegex && message.content.match(badRegex)) {
			return this.delete(message).then(() => {
				this.module.log({
					message: message,
					guildConfig: guildConfig,
					type: 'badwords',
					msgContent: message.content,
					reason: 'bad words',
				});
				if (modConfig.warnUser) {
					this.moderator.warnUser(message, 'Watch your language.');
				}
			});
		}
	}

	/**
	 * Filter invite links
	 * @param {Object} e Event data
	 */
	invites(e) {
		const { message, guildConfig } = e,
			modConfig = guildConfig.automod;

		let match = message.content.match(this.inviteRegex);
		if (match && match.length) {
			return this.delete(message).then(() => {
				this.module.log({ message: message, guildConfig: guildConfig, type: 'invite', reason: 'invite link', infraction: 2 });
				if (modConfig.warnUser) {
					this.moderator.warnUser(message, 'No invite links.');
				}
			});
		}
	}

	/**
	 * Filter duplicate characters/words
	 * @param {Object} e Event data
	 */
	duplicates(e) {
		const { message, guildConfig } = e;

		if (message.content.indexOf('```') > -1) return;

		const dupMatch = message.content.match(this.dupRegex);

		if (dupMatch && dupMatch.length) {
			return this.delete(message).then(() =>
				this.module.log({
					message: message,
					guildConfig: guildConfig,
					type: 'spamdup',
					msgContent: message.content,
					reason: 'duplicated characters/words',
					infraction: 2,
				}));
		}

		const content = message.content.replace(/(\u200b|\*|_|~|`| )/g, '');
		const clearMatch = content.match(this.clearRegex);

		if (clearMatch && clearMatch.length) {
			return this.delete(message).then(() =>
				this.module.log({
					message: message,
					guildConfig: guildConfig,
					type: 'spamclear',
					msgContent: message.content,
					reason: 'chat clearing newlines',
					infraction: 1,
				}));
		}
	}

	/**
	 * Filter links
	 * @param {Object} e Event Data
	 */
	links(e) {
		const { message, guildConfig } = e,
			modConfig = guildConfig.automod;

		let skipUrl = false;

		if (modConfig.whiteurls && modConfig.whiteurls.length) {
			for (let url of modConfig.whiteurls) {
				if (message.content.indexOf(url) > -1) skipUrl = true;
			}
		}

		if (!skipUrl) {
			return this.delete(message).then(() =>
				this.module.log({
					message: message,
					guildConfig: guildConfig,
					type: 'anylink',
					msgContent: message.content,
					reason: 'contains link',
					infraction: 1,
				}));
		}
	}

	/**
	 * Filter blacklist links
	 * @param {Object} e Event data
	 */
	blacklistLinks(e) {
		const { message, guildConfig } = e,
			modConfig = guildConfig.automod;

		let urls, regex;

		if (this.guildLists.has(`${message.channel.guild.id}:blacklist`)) {
			urls = this.guildLists.get(`${message.channel.guild.id}:blacklist`);
		} else {
			urls = modConfig.blackurls.filter(u => u && u.length).map(u => utils.regEscape(u.replace(/\*/g, '')));
			this.guildLists.set(`${message.channel.guild.id}:blacklist`, urls);
		}

		if (this.guildRegex.has(`${message.channel.guild.id}:blacklist`)) {
			regex = this.guildRegex.get(`${message.channel.guild.id}:blacklist`);
		} else {
			regex = new RegExp(urls.join('|'), 'gi');
			this.guildRegex.set(`${message.channel.guild.id}:blacklist`, regex);
		}

		const blMatch = message.content.match(regex);

		if (blMatch) {
			return this.delete(message).then(() =>
				this.module.log({
					message: message,
					guildConfig: guildConfig,
					type: 'blacklistlink',
					msgContent: message.content,
					reason: 'blacklisted link',
					infraction: 1,
				}));
		}
	}

	/**
	 * Filter link cooldowns
	 * @param {Object} e Event data
	 */
	linkCooldown(e) {
		const { message, guildConfig } = e,
			modConfig = guildConfig.automod,
			key = `${message.channel.guild.id}${message.member.id}`;

		const cooldown = this.linkCooldowns.get(key);
		const linkCooldown = modConfig.linkCooldown || 20;

		if (cooldown && cooldown.time && (Date.now() - cooldown.time) < parseInt(linkCooldown) * 1000) {
			cooldown.count++;
			return this.delete(message).then(() =>
				this.module.log({
					message: message,
					guildConfig: guildConfig,
					type: 'linkcooldown',
					msgContent: message.content,
					reason: 'link cooldown',
					infraction: 1,
				}));
		} else {
			this.linkCooldowns.set(`${message.channel.guild.id}${message.member.id}`, {
				guild: message.channel.guild,
				user: message.member,
				time: Date.now(),
				count: 1,
			});
		}
	}

	/**
	 * Filter attachments
	 * @param {Object} e Event data
	 */
	attachments(e) {
		const { message, guildConfig } = e,
			modConfig = guildConfig.automod;

		if ((message.attachments && message.attachments.length) || (message.embeds && message.embeds.length)) {
			if ((message.attachments && message.attachments.length > 4) || (message.embeds && message.embeds.length > 4)) {
				return this.delete(message).then(() => {
					this.module.log({
						message: message,
						guildConfig: guildConfig,
						type: 'attachments',
						reason: 'too many attachments',
						infraction: 2,
					});
					if (modConfig.warnUser) {
						this.moderator.warnUser(message, 'Too many attachments!');
					}
				});
			}

			let cooldown = this.attachCooldowns.get(`${message.channel.guild.id}${message.author.id}`);

			if (cooldown && cooldown.count > 2 && (Date.now() - cooldown.time) < 10000) {
				cooldown.count++;
				return this.delete(message).then(() => {
					this.module.log({
						message: message,
						guildConfig: guildConfig,
						type: 'attachcooldown',
						reason: 'possible image spamming',
						infraction: 2,
					});
					if (modConfig.warnUser) {
						this.moderator.warnUser(message, 'Slow down!');
					}
				});
			}

			this.attachCooldowns.set(`${message.channel.guild.id}${message.author.id}`, {
				guild: message.channel.guild,
				user: message.author,
				time: Date.now(),
				count: 1,
			});
		}
	}

	/**
	 * Filter selfbot use
	 * @param {Object} e Event data
	 */
	selfbots(e) {
		const { message, guildConfig } = e,
			modConfig = guildConfig.automod;

		if (message.embeds && message.embeds.length && !message.content.includes('http')) {
			if (message.embeds[0].type === 'rich') {
				this.delete(message).then(() => {
					this.module.log({
						message: message,
						guildConfig: guildConfig,
						type: 'selfbot',
						reason: 'using a selfbot',
						infraction: 1,
					});
					if (modConfig.warnUser) {
						this.moderator.warnUser(message, 'No selfbot please.');
					}
				});
			}
		}
	}

	/**
	 * Filter many caps
	 * @param {Object} e Event data
	 */
	caps(e) {
		const { message, guildConfig } = e,
			modConfig = guildConfig.automod;

		this.textRegex = this.textRegex || new RegExp(/[^a-zA-Z0-9]/, 'g');
		this.capsRegex = this.capsRegex || new RegExp(/[A-Z]/, 'g');

		const capsText = message.content.replace(this.textRegex, ''),
			capsPerc = 1 - (capsText.replace(this.capsRegex, '').length / capsText.length);

		if (capsText.length > 6 && capsPerc > 0.7) {
			return this.delete(message).then(() => {
				this.module.log({
					message: message,
					guildConfig: guildConfig,
					type: 'manycaps',
					msgContent: message.content,
					reason: 'too many caps',
				});
				if (modConfig.warnUser) {
					this.moderator.warnUser(message, 'Caps please.');
				}
			});
		}
	}

	/**
	 * Filter many emojis
	 * @param {Object} e Event data
	 */
	emojis(e) {
		const { message, guildConfig } = e;

		const emojiMatch = message.content.match(this.emojiRegex);

		if (emojiMatch && emojiMatch.length > 4) {
			return this.delete(message)
				.then(() => this.module.log({
					message: message,
					guildConfig: guildConfig,
					type: 'manyemojis',
					msgContent: message.content,
					reason: 'too many emojis',
					infraction: 1,
				}));
		}
	}
}

module.exports = Filters;

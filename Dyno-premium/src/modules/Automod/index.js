'use strict';

const Module = Loader.require('./core/structures/Module');
const Filter = Loader.require('./modules/Automod/Filter');
const Logger = Loader.require('./modules/Automod/Logger');
const Moderator = Loader.require('./modules/Automod/Moderator');
const Moderation = Loader.require('./helpers/Moderation');

/**
 * Automod Module
 * @class Automod
 * @extends Module
 */
class Automod extends Module {
	constructor(...args) {
		super(...args);

		this.module = 'Automod';
		this.description = 'Enables various auto moderation features.';
		this.enabled = false;
		this.hasPartial = true;

		this.permissions = [
			'banMembers',
			'manageMessages',
			'manageRoles',
			'manageChannels',
			'manageWebhooks',
		];
	}

	static get name() {
		return 'Automod';
	}

	get settings() {
		return {
			warnUser:           Boolean,
			badEnabled:         Boolean,
			dupEnabled:         Boolean,
			capsEnabled:        Boolean,
			rateEnabled:        Boolean,
			linksEnabled:       Boolean,
			emojisEnabled:      Boolean,
			selfbotEnabled:     Boolean,
			invitesEnabled:     Boolean,
			mentionsEnabled:    Boolean,
			cooldownEnabled:    Boolean,
			attachmentsEnabled: Boolean,
			disableGlobal:      Boolean,
			banMentions:        Boolean,
			adminEnabled:       Boolean,
			regionalEnabled:    Boolean,
			ignoredChannels:    { type: Array, default: [] },
			ignoredRoles:       { type: Array, default: [] },
			linkCooldown:       { type: Number, default: 20 },
			maxMentions:        { type: Number, default: 5 },
			muteAfter:          { type: Boolean, default: false },
			muteCount:          { type: Number, default: 3 },
			muteTime:           { type: Number, default: 10 },
			banAfter:           { type: Boolean, default: false },
			badwords:           { type: Array, default: [] },
			whiteurls:          { type: Array, default: [] },
			blackurls:          { type: Array, default: [] },
			channel:            { type: String },
			handleRaids:        { type: Boolean },
		};
	}

	start() {
		this.jobs = [];
		this.infractions = new Map();
		this.linkCooldowns = new Map();
		this.attachCooldowns = new Map();
		this.rateLimits = new Map();

		this.moderation = new Moderation(this.config, this.dyno);

		this.moderator = new Moderator(this);
		this.filter = new Filter(this);
		this.autoLogger = new Logger(this);

		this.schedule('*/1 * * * *', this.clearTimeouts.bind(this));
		this.schedule('*/5 * * * *', this.clearInfractions.bind(this));
		this.schedule('30 * * * * *', this.clearLists.bind(this));

		// remove cached docs
		this.schedule('0 * * * * *', () => {
			if (this._docs) delete this._docs;
		});

		// this.automodListener = this.autoLogger.global.bind(this.autoLogger);
		this.ipc.on('automod', this.automodListener);
	}

	unload() {
		this.ipc.removeListener('automod', this.automodListener);
	}

	disanose({ guild, guildConfig, diagnosis }) {
		if (!guildConfig.automod) return diagnosis;

		const logPerms = ['readMessages', 'sendMessages', 'embedLinks'];

		diagnosis.info.push(`Admins and Moderators are immune to automod and can't test automod.`);

		if (!this.isEnabled(guild, 'Moderation', guildConfig)) {
			diagnosis.issues.push(`The Moderation module is disabled. Please enable it.`);
		}

		if (guildConfig.automod.channel) {
			const channel = this.client.getChannel(guildConfig.automod.channel);
			if (channel) {
				const clientMember = guild.members.get(this.client.user.id);
				const perms = channel.permissionsOf(clientMember);

				for (let perm of logPerms) {
					if (!perms.has(perm)) {
						diagnosis.issues.push(`I don't have ${perm} permissions for the log channel.`);
					}
				}
			} else {
				diagnosis.issues.push(`I can't find the log channel, make sure the channel exists, and the Dyno role has read/send messages.`);
			}
		} else {
			diagnosis.info.push(`You have not set a log channel, it's recommended to create one.`);
		}
	}

	/**
	 * Clear mod infractions
	 * @return {void}
	 */
	clearTimeouts() {
		if (this.rateLimits.size) {
			for (let [key, limit] of this.rateLimits.entries()) {
				if (Date.now() - limit.createdAt < 4000) continue;
				this.rateLimits.delete(key);
			}
		}

		if (this.moderator.warnings.size) {
			for (let [key, warning] of this.moderator.warnings.entries()) {
				if (warning && warning.time >= 6000) {
					this.moderator.warnings.delete(key);
				}
			}
		}

		if (this.linkCooldowns.size) {
			for (let [key, cooldown] of this.linkCooldowns.entries()) {
				this.dyno.guilds.getOrFetch(cooldown.guild.id)
					.then(config => {
						if (!config) {
							this.linkCooldowns.delete(key);
							return;
						}

						if ((Date.now() - cooldown.time) >= (parseInt(config.automod.linkCooldown || 20) * 1000)) {
							this.linkCooldowns.delete(key);
						}
					})
					.catch(() => false);
			}
		}

		if (this.attachCooldowns.size) {
			for (let [key, cooldown] of this.attachCooldowns.entries()) {
				this.dyno.guilds.getOrFetch(cooldown.guild.id)
					.then(config => {
						if (!config) {
							this.attachCooldowns.delete(key);
							return;
						}

						if (Date.now() - cooldown.time >= 10000) {
							this.attachCooldowns.delete(key);
						}
					})
					.catch(() => false);
			}
		}
	}

	clearInfractions() {
		if (this.infractions.size) {
			for (let [key, infraction] of this.infractions.entries()) {
				if (Date.now() - infraction.createdAt < 300000) {
					this.infractions.delete(key);
				}
			}
		}
	}

	clearLists() {
		this.filter.guildLists = new Map();
		this.filter.guildRegex = new Map();
	}

	log(...args) {
		this.autoLogger.log(...args);
	}

	messageUpdate(e) {
		if (!e.message || !e.oldMessage) return;
		if (e.message.content === e.oldMessage.content) return;
		this.messageCreate(e, true);
	}

	/**
	 * Message create event handler
	 * @param {Message} message Message object
	 * @returns {*}
	 */
	messageCreate(e) {
		if (!this.dyno.isReady) return;

		const { message, guildConfig, isAdmin } = e;

		if (!message.member || message.author.bot || !message.channel.guild) return;
		if (!message.channel.guild.id || !message.member.id) return;

		if (!guildConfig) return;
		if (!this.isEnabled(message.channel.guild, this.module, guildConfig)) return;

		if (guildConfig.automod && !guildConfig.automod.adminEnabled) {
			if (isAdmin) return;
			if (this.isServerAdmin(message.member, message.channel)) return;
			if (this.isServerMod(message.member, message.channel)) return;
			if (!this.hasPermissions(message.channel.guild, 'manageMessages')) return;
		}

		const msgContent    = message.content,
			modConfig     = guildConfig.automod || {},
			iChannels     = modConfig.ignoredChannels,
			iRoles        = modConfig.ignoredRoles;

		// ignore channels
		if (iChannels && iChannels.length && iChannels.find(c => c.id === message.channel.id)) {
			return;
		}

		// ignore roles
		if (iRoles && iRoles.length && message.member.roles && message.member.roles.length) {
			for (const id of message.member.roles) {
				if (iRoles.find(r => r.id === id)) {
					return;
				}
			}
		}

		const rules = [];

		let linkMatch = null;

		const lengthCheck = msgContent.length >= 6 || (message.attachments && message.attachments.length);

		// mass mentions filter
		rules.push({
			condition: (modConfig.mentionsEnabled || modConfig.banMentions) && message.mentions && message.mentions.length,
			filter: 'mentions',
		});

		// rate limiting filter
		rules.push({
			condition: modConfig.rateEnabled,
			filter: 'ratelimit',
		});

		// invites filter
		rules.push({
			condition: lengthCheck && modConfig.invitesEnabled && msgContent.length > 12,
			filter: 'invites',
		});

		// dup text filter
		rules.push({
			condition: lengthCheck && modConfig.dupEnabled && msgContent.length > 16,
			filter: 'duplicates',
		});

		if (modConfig.linksEnabled || (modConfig.blackurls && modConfig.blackurls.length)) {
			linkMatch = msgContent.match(this.filter.linkRegex);
		}

		// link match filter
		rules.push({
			condition: lengthCheck && modConfig.linksEnabled && linkMatch,
			filter: 'links',
		});

		// blacklisted urls filter
		rules.push({
			condition: lengthCheck && linkMatch && modConfig.blackurls && modConfig.blackurls.length,
			filter: 'blacklistLinks',
		});

		// link cooldown filter
		rules.push({
			condition: lengthCheck && modConfig.cooldownEnabled && msgContent.match(this.filter.linkRegex),
			filter: 'linkCooldown',
		});

		// attachments/embed filter
		rules.push({
			condition: modConfig.attachmentsEnabled,
			filter: 'attachments',
		});

		// selfbot filter
		rules.push({
			condition: modConfig.selfbotEnabled && message.embeds && message.embeds.length,
			filter: 'selfbots',
		});

		// caps filter
		rules.push({
			condition: lengthCheck && modConfig.capsEnabled && msgContent.length > 10,
			filter: 'caps',
		});

		// bad words filter
		rules.push({
			condition: modConfig.badEnabled && msgContent.length > 2,
			filter: 'words',
		});

		// regional indicator filter
/*		rules.push({
			condition: modConfig.regionalEnabled && msgContent.length > 2,
			filter: 'regional',
		});
*/

		// emoji filter
		rules.push({
			condition: modConfig.emojisEnabled,
			filter: 'emojis',
		});

		for (let rule of rules) {
			if (!rule.condition) continue;

			let result = this.filter[rule.filter](e);
			if (result) return;
		}
	}
}

module.exports = Automod;

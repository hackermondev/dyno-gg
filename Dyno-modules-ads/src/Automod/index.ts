import { Module } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as each from 'async-each';
import * as dyno from 'Dyno';
// import * as commands from './commands';
import ModUtils from '../Moderation/ModUtils';
import * as filters from './filters';
import Logger from './Logger';
import AutomodLog from './models/AutomodLog';
import Moderator from './Moderator';

const linkRegex: RegExp = new RegExp(/https?:\/\/[\w\d-_]/, 'gi');

/**
 * Automod Module
 * @class Automod
 * @extends Module
 */
export default class Automod extends Module {
	public module: string = 'Automod';
	public description: string = 'Enables various auto moderation features.';
	public list: boolean = true;
	public enabled: boolean = false;
	public hasPartial: boolean = true;
	// public commands: {} = commands;

	public moduleModels: any[] = [
		AutomodLog,
	];

	public moderator: Moderator;
	public moderation: ModUtils;
	public autoLogger: Logger;

	public infractions: Map<string, Infraction> = new Map();
	public rateLimits: Map<string, RateLimit> = new Map();

	public permissions: string[] = [
		'banMembers',
		'manageMessages',
		'manageRoles',
		'manageChannels',
		'manageWebhooks',
	];

	private filters: any;

	get settings() {
		return {
			warnUser:           Boolean,
			badEnabled:         this.db.Schema.Types.Mixed,
			dupEnabled:         this.db.Schema.Types.Mixed,
			capsEnabled:        this.db.Schema.Types.Mixed,
			rateEnabled:        this.db.Schema.Types.Mixed,
			linksEnabled:       this.db.Schema.Types.Mixed,
			emojisEnabled:      this.db.Schema.Types.Mixed,
			selfbotEnabled:     this.db.Schema.Types.Mixed,
			invitesEnabled:     this.db.Schema.Types.Mixed,
			mentionsEnabled:    this.db.Schema.Types.Mixed,
			cooldownEnabled:    this.db.Schema.Types.Mixed,
			attachmentsEnabled: this.db.Schema.Types.Mixed,
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

	public start() {
		this.infractions = new Map();

		this.moderation = new ModUtils(this.dyno);

		this.moderator = new Moderator(this);
		this.filters = filters;
		this.autoLogger = new Logger(this);

		this.schedule('*/1 * * * *', this.clearTimeouts.bind(this));
		this.schedule('*/5 * * * *', this.clearInfractions.bind(this));
		// this.schedule('30 * * * * *', this.clearLists.bind(this));

		// remove cached docs
	}

	public diagnose({ guild, guildConfig, diagnosis }: any) {
		if (!guildConfig.automod) {
			return diagnosis;
		}

		const logPerms = ['readMessages', 'sendMessages', 'embedLinks'];

		diagnosis.info.push(`Admins and Moderators are immune to automod and can't test automod.`);

		if (!this.isEnabled(guild, 'Moderation', guildConfig)) {
			diagnosis.issues.push(`The Moderation module is disabled. Please enable it.`);
		}

		if (guildConfig.automod.channel) {
			const channel = this.client.getChannel(guildConfig.automod.channel);
			if (channel) {
				const clientMember = guild.members.get(this.client.user.id);
				const perms = channel.permissionsOf(clientMember.id);

				for (const perm of logPerms) {
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

		return diagnosis;
	}

	public log(e: LogEvent) {
		this.autoLogger.log(e);
	}

	public messageUpdate(e: any) {
		if (!e.message || !e.oldMessage) {
			return;
		}
		if (e.message.content === e.oldMessage.content) {
			return;
		}
		this.messageCreate(e, true);
	}

	/**
	 * Message create event handler
	 * @param {Message} message Message object
	 * @returns {*}
	 */
	// tslint:disable-next-line:cyclomatic-complexity
	public messageCreate(e: any, isEdit: boolean) {
		const { message, guildConfig, isAdmin } = e;
		if (!this.dyno.isReady || !guildConfig) {
			return;
		}

		const guild = (<eris.GuildChannel>message.channel).guild;

		if (!message.member || message.author.bot || !guild) {
			return;
		}
		if (!this.isEnabled(guild, this.module, guildConfig)) {
			return;
		}

		if (guildConfig.automod && !guildConfig.automod.adminEnabled) {
			if (isAdmin || this.isServerMod(message.member, message.channel)) {
				return;
			}
			if (!this.hasPermissions(guild, 'manageMessages')) {
				return;
			}
		}

		const msgContent = message.content;
		const modConfig  = guildConfig.automod || {};
		const iChannels  = modConfig.ignoredChannels;
		const iRoles     = modConfig.ignoredRoles;

		// ignore channels
		if (iChannels && iChannels.length && iChannels.find((c: any) =>
			c.id === message.channel.id || (message.channel.parentID && message.channel.parentID === c.id))) {
				return;
		}

		// ignore roles
		if (iRoles && iRoles.length && message.member.roles && message.member.roles.length) {
			for (const id of message.member.roles) {
				if (iRoles.find((r: any) => r.id === id)) {
					return;
				}
			}
		}

		let linkMatch = null;

		const lengthCheck = msgContent.length >= 6 || (message.attachments && message.attachments.length);

		if (this.filterEnabled(modConfig, 'linksEnabled') || (modConfig.blackurls && modConfig.blackurls.length)) {
			linkMatch = msgContent.match(linkRegex);
		}

		const rules = [
			{
				name: 'mentions',
				filter: modConfig.mentionsEnabled,
				condition: (this.filterEnabled(modConfig, 'mentionsEnabled') || modConfig.banMentions) &&
					message.mentions && message.mentions.length,
			},
			{
				name: 'ratelimit',
				filter: modConfig.rateEnabled,
				condition: this.filterEnabled(modConfig, 'rateEnabled'),
			},
			{
				name: 'invites',
				filter: modConfig.invitesEnabled,
				condition: lengthCheck && this.filterEnabled(modConfig, 'invitesEnabled') && msgContent.length > 12,
			},
			{
				name: 'duplicates',
				filter: modConfig.dupEnabled,
				condition: lengthCheck && this.filterEnabled(modConfig, 'dupEnabled') && msgContent.length > 16,
			},
			{
				name: 'links',
				filter: modConfig.linksEnabled,
				condition: lengthCheck && this.filterEnabled(modConfig, 'linksEnabled') && linkMatch,
			},
			{
				name: 'blacklistlinks',
				filter: null,
				condition: lengthCheck && linkMatch && modConfig.blackurls && modConfig.blackurls.length,
			},
			{
				name: 'linkcooldown',
				filter: modConfig.cooldownEnabled,
				condition: !isEdit && lengthCheck && this.filterEnabled(modConfig, 'cooldownEnabled') && msgContent.match(linkRegex),
			},
			{
				name: 'attachments',
				filter: modConfig.attachmentsEnabled,
				condition: !isEdit && this.filterEnabled(modConfig, 'attachmentsEnabled'),
			},
			{
				name: 'selfbots',
				filter: modConfig.selfbotEnabled,
				condition: this.filterEnabled(modConfig, 'selfbotEnabled') && message.embeds && message.embeds.length,
			},
			{
				name: 'spoilers',
				filter: modConfig.spoilersEnabled,
				condition: this.filterEnabled(modConfig, 'spoilersEnabled'),
			},
			{
				name: 'caps',
				filter: modConfig.capsEnabled,
				condition: lengthCheck && this.filterEnabled(modConfig, 'capsEnabled') && msgContent.length > 10,
			},
			{
				name: 'words',
				filter: modConfig.badEnabled,
				condition: this.filterEnabled(modConfig, 'badEnabled') && msgContent.length > 2,
			},
			// {
			// 	name: 'regional',
			// 	filter: modConfig.regionalEnabled,
			// 	condition: modConfig.regionalEnabled && msgContent.length > 2,
			// },
			{
				name: 'emojis',
				filter: modConfig.emojisEnabled,
				condition: this.filterEnabled(modConfig, 'emojisEnabled'),
			},
		];

		for (const rule of rules) {
			if (!rule.condition || !this.filters[rule.name]) {
				continue;
			}

			let filter: any = {};

			if (rule.filter) {
				if (typeof rule.filter === 'object') {
					filter = rule.filter;
				} else if (typeof rule.filter === 'boolean') {
					filter = {
						delete: true,
						warn: modConfig.warnUser || false,
						automute: modConfig.muteAfter || false,
						instantban: rule.name === 'mentions' && modConfig.banMentions,
					};

					if (['words', 'caps'].includes(rule.name)) {
						filter.automute = false;
					}
				}

				if (filter.ignoredChannels && filter.ignoredChannels.length) {
					if (filter.ignoredChannels.find((c: any) => c.id === message.channel.id)) {
						continue;
					}
				}

				if (filter.ignoredRoles && filter.ignoredRoles.length && message.member.roles) {
					if (filter.ignoredRoles.find((r: any) => message.member.roles.includes(r.id))) {
						continue;
					}
				}

				e.filter = filter;
			}

			if (this.filters[rule.name](this.autoLogger, this.moderator, e)) {
				return;
			}
		}
	}

	private filterEnabled(modConfig: any, filter: string): boolean {
		const enabledKeys = ['warn', 'delete', 'automute', 'instantban'];

		if (typeof modConfig[filter] === 'boolean' && modConfig[filter] === true) {
			return true;
		}

		if (typeof modConfig[filter] === 'object') {
			if (enabledKeys.find((key: string) => modConfig[filter][key] === true)) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Clear mod infractions
	 */
	private clearTimeouts() {
		if (this.moderator.warnings.size) {
			each([...this.moderator.warnings.keys()], (key: string) => {
				const warning = this.moderator.warnings.get(key);
				if (warning && warning.time >= 6000) {
					this.moderator.warnings.delete(key);
				}
			});
		}
	}

	private clearInfractions() {
		if (this.infractions.size) {
			each([...this.infractions.keys()], (key: string) => {
				const infraction = this.infractions.get(key);
				if (Date.now() - infraction.createdAt < 300000) {
					this.infractions.delete(key);
				}
			});
		}
	}
}

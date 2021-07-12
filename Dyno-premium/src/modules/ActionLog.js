'use strict';

const moment = require('moment');
const each = require('async-each');
const Module = Loader.require('./core/structures/Module');
const utils = Loader.require('./core/utils');
const { Server, Message } = require('../core/models');

/**
 * Action Log module
 * @extends Module
 */
class ActionLog extends Module {
	/**
	 * A log of various guild events and bot commands
	 * @param {Object} config The dyno configuration object
	 * @param {Dyno} dyno The Dyno instance
	 */
	constructor() {
		super();

		this.module = 'ActionLog';
		this.friendlyName = 'Action Log';
		this.description = 'Server action log.';
		this.enabled = false;
		this.hasPartial = true;

		this.permissions = [
			'manageWebhooks',
		];
	}

	static get name() {
		return 'ActionLog';
	}

	get settings() {
		return {
			channel:            { type: String },
			guildMemberAdd:     { type: Boolean },
			guildMemberRemove:  { type: Boolean },
			guildBanAdd:        { type: Boolean },
			guildBanRemove:     { type: Boolean },
			messageEdit:        { type: Boolean },
			messageDelete:      { type: Boolean },
			messageDeleteBulk:  { type: Boolean },
			channelCreate:      { type: Boolean },
			channelDelete:      { type: Boolean },
			guildRoleCreate:    { type: Boolean },
			guildRoleDelete:    { type: Boolean },
			guildRoleUpdate:    { type: Boolean },
			memberRoleAdd:      { type: Boolean },
			memberRoleRemove:   { type: Boolean },
			invites: 			{ type: Boolean },
			commands:           { type: Boolean },
			nickChange:         { type: Boolean },
			userChange:         { type: Boolean },
			voiceChannelJoin:   { type: Boolean },
			voiceChannelLeave:  { type: Boolean },
			voiceChannelSwitch: { type: Boolean },
			ignoredChannels:    { type: Array, default: [] },
            showThumb:          { type: Boolean },
		};
	}

	start(client) {
		this._client = client;
		this.commandListener = this.onCommand.bind(this);
		this.bans = [];
		this.roles = new Map();
		this.invites = new Set();

		this.dyno.commands.on('command', this.commandListener);

		this.schedule('*/5 * * * *', this.clearBans.bind(this));
		this.schedule('*/1 * * * *', this.cleanup.bind(this));
		this.schedule('*/30 * * * *', () => {
			if (this._userGuildCache) {
				delete this._userGuildCache;
			}
		});

		this.inviteRegex = new RegExp('(discordapp.com/invite|discord.me|discord.gg)(?:/#)?(?:/invite)?/([a-zA-Z0-9\-]+)'); // eslint-disable-line
	}

	clearBans() {
		this.bans = [];
	}

	cleanup() {
		this.invites = new Set();
	}

	unload() {
		this.dyno.commands.removeListener('command', this.commandListener);
	}

	/**
	 * Determine if an event should be logged
	 * @param {String} event Event to check
	 * @param {Guild} guild Guild object
	 * @param {GuildChannel} [channel] Channel to check if the event should be ignored.
	 * @returns {GuildChannel|*}
	 */
	shouldLog(e) {
		if (!e.guild || !e.guild.id) return Promise.resolve();
		let { event, guild, channel, guildConfig } = e;

		// attempt to get guild config if not provided by the event
		if (!guildConfig) {
			return new Promise(resolve => {
				this.dyno.guilds.getOrFetch(guild.id).then(guildConfig => {
					if (!guildConfig) return resolve();
					if (!this.isEnabled(guild, this, guildConfig)) return resolve();

					e.guildConfig = guildConfig;

					return this.shouldLog(e);
				}).catch(() => resolve());
			});
		}

		if (!this.isEnabled(guild, this, guildConfig)) return Promise.resolve();

		if (!guildConfig.actionlog || !guildConfig.actionlog.channel)  {
			return Promise.resolve();
		}

		if (!guildConfig.actionlog[event]) {
			return Promise.resolve();
		}

		if (channel && guildConfig.actionlog.ignoredChannels && guildConfig.actionlog.ignoredChannels.length) {
			if (guildConfig.actionlog.ignoredChannels.find(c => c.id === channel.id)) {
				return Promise.resolve();
			}
		}

		return Promise.resolve(this._client.getChannel(guildConfig.actionlog.channel));
	}

	userGuildCache() {
		if (this._userGuildCache) {
			return Promise.resolve(this._userGuildCache);
		}

		return Server.find({ 'modules.ActionLog': true, 'actionlog.userChange': true })
			.select('_id')
			.lean()
			.exec()
			.then(docs => {
				docs = docs.map(d => d._id);
				this._userGuildCache = docs;
				return docs;
			})
			.catch(() => false);
	}

	/**
	 * Log an event to a channel
	 * @param {GuildChannel} channel Channel object
	 * @param {Object} embed Embed object
	 */
	logEvent(channel, embed, guildConfig) {
		if (this.config.isPremium && guildConfig.isPremium) {
			return this.sendMessage(channel, { embed });
		}

		if (!this.hasPermissions(channel.guild, 'manageWebhooks')) {
			let skip = false;

			if (this.permCooldowns && this.permCooldowns.has(channel.guild.id)) {
				if ((Date.now() - this.permCooldowns.get(channel.guild.id)) < 60000) skip = true;
			}

			if (!skip) {
				let warning = [
					`:warning: **Missing Permissions**\n`,
					`Due to a necessary change for performance, I need __Manage Webhooks__ permissions to send logs.`,
					`Once the permission is enabled, logs can continue.`,
				];

				this.permCooldowns = this.permCooldowns || new Map();
				this.permCooldowns.set(channel.guild.id, Date.now());

				return this.sendMessage(channel, warning);
			}

			return Promise.resolve();
		}

		return this.sendWebhook(channel, { embeds: [embed] }, guildConfig)
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
				this.sendMessage(channel, { embed });
				return Promise.resolve();
			});
	}

	/**
	 * Get message from the database
	 * @param {Number} id Message ID
	 * @returns {Promise}
	 */
	getMessage(id) {
		return Message.find({ id: id }).lean().exec();
	}

	messageCreate({ message, guildConfig }) {
		this.shouldLog({ event: 'invites', guild: message.channel.guild, channel: message.channel, guildConfig }).then(async (logChannel) => {
			if (!logChannel) return;
			const match = message.content.match(this.inviteRegex);
			if (!match) return;

			let code = match.pop(),
				key = `${message.channel.id}.${message.author.id}.${code}`;

			if (this.invites.has(key)) return;
			this.invites.add(key);

			try {
				var invite = await this.client.getInvite(code, true);
			} catch (err) {
				return;
			}

			if (!invite) return;

			let link = match[0].startsWith('http') ? match[0] : `https://${match[0]}`;

			const embed = {
				color: utils.getColor('blue'),
				author: {
					name: utils.fullName(message.author),
					icon_url: message.author.avatarURL,
				},
				description: `**Invite posted for ${invite.guild.name} ${message.channel.mention}**\n${link}`,
				fields: [],
				footer: { text: `ID: ${invite.guild.id}` },
			};

			if (invite.inviter) {
				embed.fields.push({ name: 'Inviter', value: utils.fullName(invite.inviter), inline: true });
			}

			if (invite.channel) {
				embed.fields.push({ name: 'Channel', value: `#${invite.channel.name}`, inline: true });
			}

			if (invite.memberCount) {
				if (invite.presenceCount) {
					embed.fields.push({ name: 'Members', value: `${invite.presenceCount}/${invite.memberCount}`, inline: true });
				} else {
					embed.fields.push({ name: 'Members', value: `${invite.memberCount}`, inline: true });
				}
			}

			if (message.guild.id === this.config.dynoGuild) {
				try {
					var inviteGuild = await Server.findOne({ _id: invite.guild.id }, { deleted: 1, ownerID: 1 }).lean().exec();
				} catch (err) {
					// pass
				}

				if (inviteGuild) {
					embed.fields.push({ name: 'Dyno', value: inviteGuild.deleted === true ? 'Kicked' : 'In Server', inline: true });

					if (inviteGuild.ownerID) {
						var owner = this.client.users.get(inviteGuild.ownerID);
						if (!owner) {
							owner = await this.restClient.getRESTUser(inviteGuild.ownerID);
						}

						if (owner) {
							embed.fields.push({ name: 'Owner', value: utils.fullName(owner), inline: true });
						}
					}
				} else {
					embed.fields.push({ name: 'Dyno', value: 'Never Added', inline: true });
				}
			}

			return this.logEvent(logChannel, embed, guildConfig);
		});
	}

	/**
	 * Handle command received
	 * @param {Command} command The command triggered
	 * @param {Message} message The message received
	 * @returns {*}
	 */
	onCommand({ command, message }) {
		this.shouldLog({ event: 'commands', guild: message.channel.guild, channel: message.channel }).then(async (logChannel) => {
			if (!logChannel) return;

			if (['Manager', 'Moderator'].includes(command.group)) {
				const description = `Used \`${command.name}\` command in ${message.channel.mention}\n` +
					message.cleanContent;

				const embed = {
					color: utils.getColor('blue'),
					description: description,
					author: {
						name: utils.fullName(message.author, false),
						icon_url: message.author.avatarURL,
					},
					timestamp: new Date(),
				};

				let guildConfig = await this.dyno.guilds.getOrFetch(message.guild.id);
				if (!guildConfig) return;

				return this.logEvent(logChannel, embed, guildConfig);
			}
		});
	}

	/**
	 * Handle member join
	 * @param {Guild} guild Guild object
	 * @param {Member} member Member object
	 * @returns {*}
	 */
	guildMemberAdd({ guild, member, guildConfig }) {
		this.shouldLog({ event: 'guildMemberAdd', guild, guildConfig }).then(logChannel => {
			if (!logChannel) return;

			const embed = {
				color: utils.getColor('green'),
				author: {
					name: 'Member Joined',
					icon_url: member.avatarURL,
				},
				description: `${member.mention} ${utils.fullName(member)}`,
				footer: { text: `ID: ${member.id}` },
				timestamp: new Date(),
			};

            if (guildConfig.actionlog && guildConfig.actionlog.showThumb) {
                embed.thumbnail = { url: member.avatarURL };
            }

			const newAccountThreshold = guildConfig.newAccThreshold || 2;
            const diff = Date.now() - member.createdAt;

            if (diff < (86400 * newAccountThreshold * 1000)) {
                const age = moment.duration(diff / 1000, 'seconds');
                const ageFormatted = age.format('w [weeks] d [days], h [hrs], m [min], s [sec]');
				embed.fields = [{ name: 'New Account', value: `Created ${ageFormatted} ago` }];
			}

			return this.logEvent(logChannel, embed, guildConfig);
		});
	}

	/**
	 * Handle member leave
	 * @param {Guild} guild Guild object
	 * @param {Member} member Member object
	 * @returns {*}
	 */
	guildMemberRemove({ guild, member, guildConfig }) {
		this.shouldLog({ event: 'guildMemberRemove', guild, guildConfig }).then(logChannel => {
			if (!logChannel) return;

			const index = this.bans.indexOf(`${guild.id}${member.id}`);
			if (index > -1) {
				this.bans.splice(index, 1);
				return;
			}

			const embed = {
				color: utils.getColor('orange'),
				author: {
					name: 'Member Left',
					icon_url: member.avatarURL,
				},
				description: `${member.mention} ${utils.fullName(member)}`,
				footer: { text: `ID: ${member.id}` },
				timestamp: new Date(),
			};

			if (guildConfig.actionlog && guildConfig.actionlog.showThumb) {
				embed.thumbnail = { url: member.avatarURL };
			}

			return this.logEvent(logChannel, embed, guildConfig);
		});
	}

	/**
	 * Handle member ban
	 * @param {Guild} guild Guild object
	 * @param {User} user User object
	 * @returns {*}
	 */
	guildBanAdd({ guild, member, guildConfig }) {
		this.shouldLog({ event: 'guildBanAdd', guild, guildConfig }).then(logChannel => {
			if (!logChannel) return;

			const embed = {
				color: utils.getColor('orange'),
				author: {
					name: 'Member Banned',
					icon_url: member.avatarURL,
				},
				thumbnail: { url: member.avatarURL },
				description: `${member.mention} ${utils.fullName(member)}`,
				footer: { text: `ID: ${member.id}` },
				timestamp: new Date(),
			};

			this.bans.push(`${guild.id}${member.id}`);

			return this.logEvent(logChannel, embed, guildConfig);
		});
	}

	/**
	 * Handle member unban
	 * @param {Guild} guild Guild object
	 * @param {User} user User object
	 * @returns {*}
	 */
	guildBanRemove({ guild, member, guildConfig }) {
		this.shouldLog({ event: 'guildBanRemove', guild, guildConfig }).then(logChannel => {
			if (!logChannel) return;

			const embed = {
				color: utils.getColor('blue'),
				author: {
					name: 'Member Unbanned',
					icon_url: member.avatarURL,
				},
				thumbnail: { url: member.avatarURL },
				description: `${member.mention} ${utils.fullName(member)}`,
				footer: { text: `ID: ${member.id}` },
				timestamp: new Date(),
			};

			return this.logEvent(logChannel, embed, guildConfig);
		});
	}

	/**
	 * Handle edited messages
	 * @param {Message} options.message Message object
	 * @param {Message} options.oldMessage Old message object
	 * @param {Object} options.guildConfig Guild configuration
	 */
	messageUpdate({ message, oldMessage, guildConfig }) {
		if (!message || !oldMessage) return;
		if (!message.author || message.author.bot) return;
		if (message.content === oldMessage.content) return;

		this.shouldLog({ event: 'messageEdit', guild: message.guild, channel: message.channel, guildConfig }).then(logChannel => {
			if (!logChannel) return;

			const embed = {
				color: utils.getColor('blue'),
				author: {
					name: utils.fullName(message.author, false),
					icon_url: message.author.avatarURL,
				},
				description: `**Message edited in ${message.channel.mention || '#deleted-channel'}**`,
				fields: [
					{ name: 'Before', value: oldMessage.content.length > 255 ?
						`${oldMessage.content.substr(0, 252)}...` : `${oldMessage.content}` },
					{ name: 'After', value: message.cleanContent.length > 255 ?
						`${message.cleanContent.substr(0, 252)}...` : `${message.cleanContent}` },
				],
				footer: { text: `User ID: ${message.author.id}` },
				timestamp: new Date(),
			};

			return this.logEvent(logChannel, embed, guildConfig);
		});
	}

	/**
	 * Handle message delete
	 * @param {Message} message Message object
	 * @returns {*}
	 */
	messageDelete({ message, guildConfig }) {
		let guild = null,
			channel = null;

		if (!message.channel.guild) {
			if (message.channelID) {
				channel = this._client.getChannel(message.channelID);
				guild = channel.guild;
				// guild = this._client.guilds.get(this._client.channelGuildMap[message.channelID]);
			} else return;
		} else {
			guild = this._client.guilds.get(message.channel.guild.id);
		}

		channel = channel || message.channel;

		if (message.author && message.author.bot) return;

		this.shouldLog({ event: 'messageDelete', guild, channel: channel, guildConfig }).then(async logChannel => {
			if (!logChannel) return;

			if (!channel) {
				channel = message.channel || {};
			}

			const author = message && message.author ? ` sent by ${message.author.mention}` : '';
			const embed = {
				color: utils.getColor('orange'),
				description: `**Message${author} deleted in ${channel.mention || '#deleted-channel'}**`,
				author: {
					name: message.author ? utils.fullName(message.author, false) : guild.name,
					icon_url: message.author ? message.author.avatarURL || null : guild.iconURL,
				},
				footer: { text: `ID: ${message.author ? message.author.id : channel.id}` },
				timestamp: new Date(),
			};

			if (message.cleanContent) {
				embed.description += '\n';
				embed.description += message.cleanContent.length > 255 ?
					`${message.cleanContent.substr(0, 252)}...` :
					message.cleanContent;
			}

			return this.logEvent(logChannel, embed, guildConfig);
		});
	}

	/**
	 * Handle message delete bulk event
	 * @param {Channel|GuildChannel} channel Channel object
	 * @param {Array} ids Array of deleted message ids
	 * @returns {*}
	 */
	messageDeleteBulk(channel, ids) {
		if ((channel.type !== 0 && channel.type !== 2) || !channel.guild) return;

		const guild = channel.guild;

		this.shouldLog('messageDeleteBulk', guild, channel).then(async (logChannel) => {
			if (!logChannel) return;

			const embed = {
				color: utils.getColor('blue'),
				description: `**Bulk Delete in ${channel.mention}, ${ids.length} messages deleted**`,
				author: {
					name: guild.name,
					icon_url: guild.iconURL || null,
				},
				footer: { text: '-' },
				timestamp: new Date(),
			};

			let guildConfig = await this.dyno.guilds.getOrFetch(guild.id);
			if (!guildConfig) return;

			return this.logEvent(logChannel, embed, guildConfig);
		});
	}

	/**
	 * Handle channel create
	 * @param {Channel|GuildChannel} channel Channel object
	 * @returns {*}
	 */
	channelCreate({ channel, guildConfig }) {
		if ((channel.type !== 0 && channel.type !== 2) || !channel.guild) return;

		const guild = channel.guild;

		this.shouldLog({ event: 'channelCreate', guild, guildConfig }).then(logChannel => {
			if (!logChannel) return;

			const embed = {
				color: utils.getColor('green'),
				description: `**Channel Created: #${channel.name}**`,
				author: {
					name: guild.name,
					icon_url: guild.iconURL || null,
				},
				footer: { text: `ID: ${channel.id}` },
				timestamp: new Date(),
			};

			return this.logEvent(logChannel, embed, guildConfig);
		});
	}

	/**
	 * Handle channel delete
	 * @param {Channel|GuildChannel} channel Channel object
	 * @returns {*}
	 */
	channelDelete({ channel, guildConfig }) {
		if ((channel.type !== 0 && channel.type !== 2) || !channel.guild) return;

		const guild = channel.guild;

		this.shouldLog({ event: 'channelDelete', guild, guildConfig }).then(logChannel => {
			if (!logChannel) return;

			const embed = {
				color: utils.getColor('orange'),
				description: `**Channel Deleted: #${channel.name}**`,
				author: {
					name: guild.name,
					icon_url: guild.iconURL || null,
				},
				footer: { text: `ID: ${channel.id}` },
				timestamp: new Date(),
			};

			return this.logEvent(logChannel, embed, guildConfig);
		});
	}

	/**
	 * Handle role create
	 * @param {Guild} guild Guild object
	 * @param {Role} role Role object
	 * @returns {*}
	 */
	guildRoleCreate({ guild, role, guildConfig }) {
		this.shouldLog({ event: 'guildRoleCreate', guild, guildConfig }).then(logChannel => {
			if (!logChannel) return;

			const embed = {
				color: utils.getColor('green'),
				description: `**Role Created: ${role.name}**`,
				author: {
					name: guild.name,
					icon_url: guild.iconURL || null,
				},
				footer: { text: `ID: ${role.id}` },
				timestamp: new Date(),
			};

			if (role.name === 'new role') {
				this.roles.set(role.id, { logChannel, embed });
				return;
			}

			return this.logEvent(logChannel, embed, guildConfig);
		});
	}

	/**
	 * Handle role update
	 * @param {Guild} guild Guild Object
	 * @param {Role} role Role Object
	 * @param {Object} oldRole Old role object
	 * @returns {*}
	 */
	guildRoleUpdate({ guild, role, oldRole, guildConfig }) {
		if (!role || !role.hasOwnProperty('id')) return;

		const createdRole = this.roles.get(role.id);
		if (createdRole) {
			return this.logEvent(createdRole.logChannel, createdRole.embed, guildConfig).then(() => this.roles.delete(role.id));
		}

		this.shouldLog({ event: 'guildRoleUpdate', guild, guildConfig }).then(logChannel => {
			if (!logChannel) return;

			// temporarily disable until a better fix to prevent multiple name changes per character typed
			// if (role.name !== oldRole.name) {
			// 	this.roleUpdate({ guild, role, oldRole, logChannel, event: 'name' });
			// }

			if (role.color !== oldRole.color) {
				this.roleUpdate({ guild, role, oldRole, logChannel, event: 'color', guildConfig });
			}
		});
	}

	/**
	 * Internal method to fire role update events
	 * @param {Object} e Event data
	 * @return {*}
	 */
	roleUpdate(e) {
		const embed = {
			color: utils.getColor('blue'),
			description: `**Role ${utils.ucfirst(e.event)} Changed: ${e.oldRole[e.event]} -> ${e.role[e.event]}**`,
			author: {
				name: e.guild.name,
				icon_url: e.guild.iconURL || null,
			},
			footer: { text: `ID: ${e.role.id}` },
			timestamp: new Date(),
		};

		return this.logEvent(e.logChannel, embed, e.guildConfig);
	}

	/**
	 * Handle role delete
	 * @param {Guild} guild Guild object
	 * @param {Role} role Role object
	 * @returns {*}
	 */
	guildRoleDelete({ guild, role, guildConfig }) {
		this.shouldLog({ event: 'guildRoleDelete', guild, guildConfig }).then(logChannel => {
			if (!logChannel) return;

			const embed = {
				color: utils.getColor('orange'),
				description: `**Role Deleted: ${role.name || 'unknown'}**`,
				author: {
					name: guild.name,
					icon_url: guild.iconURL || null,
				},
				footer: { text: `ID: ${role.id}` },
				timestamp: new Date(),
			};

			return this.logEvent(logChannel, embed, guildConfig);
		});
	}

	/**
	 * Handle guild member update
	 * @param {Guild} guild Guild Object
	 * @param {Member} member Member Object
	 * @param {Object} oldMember Old member object
	 */
	guildMemberUpdate({ guild, member, oldMember, guildConfig }) {
		if (!oldMember) {
			oldMember = Object.assign({}, member, { nick: 'None' });
		}

		if (member.nick !== oldMember.nick) {
			this.nickChange({ guild, member, oldMember, guildConfig });
		}

		if (member.roles !== oldMember.roles) {
			const addedRoles = member.roles.filter(r => !oldMember.roles.includes(r));
			const removedRoles = oldMember.roles.filter(r => !member.roles.includes(r));

			if (addedRoles.length) {
				each(addedRoles, roleId => this.memberRoleAdd({ guild, member, roleId, guildConfig }));
			}
			if (removedRoles.length) {
				each(removedRoles, roleId => this.memberRoleRemove({ guild, member, roleId, guildConfig }));
			}
		}
	}

	/**
	 * Handle user update
	 * @param {User} user User Object
	 * @param {Object} oldUser Old user object
	 */
	userUpdate(user, oldUser) {
		if (!this.config.usernameUpdateEnabled) return;

		if (!user || !oldUser || user.username === oldUser.username) {
			return;
		}

		this.userGuildCache().then(async guilds => {
			if (!guilds) return;

			each(guilds, async id => {
				const guild = this._client.guilds.get(id);

				if (!guild || !await this.isEnabled(guild, this)) return;
				if (!guild.members.find(m => m.id === user.id)) return;

				this.userChange({ guild, user, oldUser });
			});
		}).catch(() => false);
	}

	/**
	 * Handle nickname change
	 * @param {Guild} guild Guild Object
	 * @param {Member} member Member Object
	 * @param {Object} oldMember Old member object
	 * @returns {*}
	 */
	nickChange({ guild, member, oldMember, guildConfig }) {
		this.shouldLog({ event: 'nickChange', guild, guildConfig }).then(logChannel => {
			if (!logChannel) return;

			const embed = {
				color: utils.getColor('blue'),
				description: `**${member.mention} nickname changed**`,
				author: {
					name: utils.fullName(member, false),
					icon_url: member.avatarURL,
				},
				fields: [
					{ name: 'Before', value: oldMember.nick || 'None' },
					{ name: 'After', value: member.nick || 'None' },
				],
				footer: { text: `ID: ${member.id}` },
				timestamp: new Date(),
			};

			return this.logEvent(logChannel, embed, guildConfig);
		});
	}

	/**
	 * Handle username change
	 * @param {Guild} guild Guild Object
	 * @param {User} user User Object
	 * @param {Object} oldUser Old user object
	 * @returns {*}
	 */
	userChange({ guild, user, oldUser, guildConfig }) {
		this.shouldLog({ event: 'userChange', guild, guildConfig }).then(logChannel => {
			if (!logChannel) return;

			const embed = {
				color: utils.getColor('blue'),
				description: `**${user.mention} username changed**`,
				author: {
					name: utils.fullName(user, false),
					icon_url: user.avatarURL,
				},
				fields: [
					{ name: 'Before', value: utils.fullName(oldUser) || 'None' },
					{ name: 'After', value: utils.fullName(user) || 'None' },
				],
				footer: { text: `ID: ${user.id}` },
				timestamp: new Date(),
			};

			return this.logEvent(logChannel, embed, guildConfig);
		});
	}

	/**
	 * Handle member added to a role
	 * @param {Guild} guild Guild Object
	 * @param {Member} member Member Object
	 * @param {String} roleId Role ID
	 * @returns {*}
	 */
	memberRoleAdd({ guild, member, roleId, guildConfig }) {
		this.shouldLog({ event: 'memberRoleAdd', guild, guildConfig }).then(logChannel => {
			if (!logChannel) return;

			const role = guild.roles.get(roleId);
			if (!role) return;

			const embed = {
				color: utils.getColor('blue'),
				description: `**${member.mention} was given the \`${role.name}\` role**`,
				author: {
					name: utils.fullName(member, false),
					icon_url: member.avatarURL,
				},
				footer: { text: `ID: ${member.id}` },
				timestamp: new Date(),
			};

			return this.logEvent(logChannel, embed, guildConfig);
		});
	}

	/**
	 * Handle member removed from a role
	 * @param {Guild} guild Guild Object
	 * @param {Member} member Member Object
	 * @param {String} roleId Role ID
	 * @returns {*}
	 */
	memberRoleRemove({ guild, member, roleId, guildConfig }) {
		this.shouldLog({ event: 'memberRoleRemove', guild, guildConfig }).then(logChannel => {
			if (!logChannel) return;

			const role = guild.roles.get(roleId);
			if (!role) return;

			const embed = {
				color: utils.getColor('blue'),
				description: `**${member.mention} was removed from the \`${role.name}\` role**`,
				author: {
					name: utils.fullName(member, false),
					icon_url: member.avatarURL,
				},
				footer: { text: `ID: ${member.id}` },
				timestamp: new Date(),
			};

			return this.logEvent(logChannel, embed, guildConfig);
		});
	}

	/**
	 * Handle voice channel join
	 * @param {Member} member Guild member
	 * @param {GuildChannel) channel Voice channel
	 * @returns {*}
	 */
	voiceChannelJoin({ guild, member, channel, guildConfig }) {
		this.shouldLog({ event: 'voiceChannelJoin', guild, guildConfig }).then(logChannel => {
			if (!logChannel) return;

			const embed = {
				color: utils.getColor('green'),
				description: `**${member.mention} joined voice channel ${channel.mention || channel.name}**`,
				author: {
					name: utils.fullName(member, false),
					icon_url: member.avatarURL || null,
				},
				footer: { text: `ID: ${member.id}` },
				timestamp: new Date(),
			};

			return this.logEvent(logChannel, embed, guildConfig);
		});
	}

	/**
	 * Handle voice channel leave
	 * @param {Member} member Guild member
	 * @param {GuildChannel) channel Voice channel
	 * @returns {*}
	 */
	voiceChannelLeave({ guild, member, channel, guildConfig }) {
		this.shouldLog({ event: 'voiceChannelLeave', guild, guildConfig }).then(logChannel => {
			if (!logChannel) return;

			const embed = {
				color: utils.getColor('green'),
				description: `**${member.mention} left voice channel ${channel.mention || channel.name}**`,
				author: {
					name: utils.fullName(member, false),
					icon_url: member.avatarURL || null,
				},
				footer: { text: `ID: ${member.id}` },
				timestamp: new Date(),
			};

			return this.logEvent(logChannel, embed, guildConfig);
		});
	}

	/**
	 * Handle voice chanel switch
	 * @param {Member} member Guild member
	 * @param {GuildChannel} channel New voice channel
	 * @param {GuildChannel} oldChannel Old voice channel
	 * @returns {*}
	 */
	voiceChannelSwitch({ guild, member, channel, oldChannel, guildConfig }) {
		this.shouldLog({ event: 'voiceChannelSwitch', guild, guildConfig }).then(logChannel => {
			if (!logChannel) return;

			const embed = {
				color: utils.getColor('green'),
				description: `**${member.mention} switched voice channel \`#${oldChannel.name}\` -> \`#${channel.name}\`**`,
				author: {
					name: utils.fullName(member, false),
					icon_url: member.avatarURL || null,
				},
				footer: { text: `ID: ${member.id}` },
				timestamp: new Date(),
			};

			return this.logEvent(logChannel, embed, guildConfig);
		});
	}
}

module.exports = ActionLog;

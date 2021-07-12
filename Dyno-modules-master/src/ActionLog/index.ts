import { Module } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as each from 'async-each';
import * as dyno from 'Dyno';
import * as moment from 'moment';
// import * as commands from './commands';

require('moment-duration-format');

/**
 * Action Log module
 * @extends Module
 */
export default class ActionLog extends Module {
	public module      : string   = 'ActionLog';
	public friendlyName: string   = 'Action Log';
	public description : string   = 'Customizable log of events that happen in the server.';
	public list        : boolean  = true;
	public enabled     : boolean  = false;
	public hasPartial  : boolean  = true;
	public permissions : string[] = ['manageWebhooks'];
	// public commands    : {}       = commands;

	public bans: any[] = [];
	public roles: Map<any, any> = new Map();
	public invites: Set<any> = new Set();
	private inviteRegex: RegExp;
	private commandListener: Function;
	private permCooldowns: Map<string, number>;

	get settings() {
		return {
			channel:            { type: String },
			guildMemberAdd:     { type: this.db.Schema.Types.Mixed },
			guildMemberRemove:  { type: this.db.Schema.Types.Mixed },
			guildBanAdd:        { type: this.db.Schema.Types.Mixed },
			guildBanRemove:     { type: this.db.Schema.Types.Mixed },
			messageEdit:        { type: this.db.Schema.Types.Mixed },
			messageDelete:      { type: this.db.Schema.Types.Mixed },
			messageDeleteBulk:  { type: this.db.Schema.Types.Mixed },
			channelCreate:      { type: this.db.Schema.Types.Mixed },
			channelDelete:      { type: this.db.Schema.Types.Mixed },
			guildRoleCreate:    { type: this.db.Schema.Types.Mixed },
			guildRoleDelete:    { type: this.db.Schema.Types.Mixed },
			guildRoleUpdate:    { type: this.db.Schema.Types.Mixed },
			memberRoleAdd:      { type: this.db.Schema.Types.Mixed },
			memberRoleRemove:   { type: this.db.Schema.Types.Mixed },
			invites: 			{ type: this.db.Schema.Types.Mixed },
			commands:           { type: this.db.Schema.Types.Mixed },
			nickChange:         { type: this.db.Schema.Types.Mixed },
			userChange:         { type: this.db.Schema.Types.Mixed },
			voiceChannelJoin:   { type: this.db.Schema.Types.Mixed },
			voiceChannelLeave:  { type: this.db.Schema.Types.Mixed },
			voiceChannelSwitch: { type: this.db.Schema.Types.Mixed },
			ignoredChannels:    { type: Array, default: [] },
			showThumb:          { type: Boolean },
		};
	}

	public start() {
		this.commandListener = this.onCommand.bind(this);

		this.dyno.commands.on('command', this.commandListener);

		this.schedule('*/5 * * * *', this.clearBans.bind(this));
		this.schedule('*/1 * * * *', this.cleanup.bind(this));
		this.schedule('*/30 * * * *', () => {
			if (this._userGuildCache) {
				delete this._userGuildCache;
			}
		});

		this.inviteRegex = new RegExp('(discordapp.com/invite|discord.me|discord.gg)(?:/#)?(?:/invite)?/([a-zA-Z0-9\-]+)');
	}

	public unload() {
		this.dyno.commands.removeListener('command', this.commandListener);
	}

	public diagnose({ guild, guildConfig, diagnosis }: any) {
		if (!guildConfig.actionlog) {
			return diagnosis;
		}

		if (!this.hasPermissions(guild, 'manageWebhooks')) {
			diagnosis.issues.push(`I don't have Manage Webhooks permission. This is needed to post logs.`);
		}

		if (guildConfig.actionlog.channel && guildConfig.actionlog.channel !== 'Select Channel') {
			const channel = this.client.getChannel(guildConfig.actionlog.channel);
			if (!channel) {
				diagnosis.issues.push(`I can't find the log channel. It is hidden from me or deleted.`);
			} else {
				diagnosis.info.push(`The log channel is <#${channel.id}>.`);
			}
		}

		return diagnosis;
	}

	public messageCreate({ message, guildConfig }: any) {
		this.shouldLog({ event: 'invites', guild: message.channel.guild, channel: message.channel, guildConfig })
		.then(async (logChannel: eris.GuildChannel) => {
			if (!logChannel) { return; }
			const match = message.content.match(this.inviteRegex);
			if (!match) { return; }

			const code = match.pop();
			const key = `${message.channel.id}.${message.author.id}.${code}`;

			if (this.invites.has(key)) { return; }
			this.invites.add(key);

			let invite;
			try {
				invite = await this.client.getInvite(code, true);
			} catch (err) {
				return;
			}

			if (!invite) { return; }

			const link = match[0].startsWith('http') ? match[0] : `https://${match[0]}`;

			const embed = {
				color: this.utils.getColor('blue'),
				author: {
					name: this.utils.fullName(message.author),
					icon_url: message.author.avatarURL,
				},
				description: `**Invite posted for ${invite.guild.name} ${message.channel.mention}**\n${link}`,
				fields: [],
				footer: { text: `ID: ${invite.guild.id}` },
			};

			if (invite.inviter) {
				embed.fields.push({ name: 'Inviter', value: this.utils.fullName(invite.inviter), inline: true });
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
				let inviteGuild;
				try {
					inviteGuild = await this.models.Server.findOne({ _id: invite.guild.id }, { deleted: 1, ownerID: 1 }).lean().exec();
				} catch (err) {
					// pass
				}

				if (inviteGuild) {
					embed.fields.push({ name: 'Dyno', value: inviteGuild.deleted === true ? 'Kicked' : 'In Server', inline: true });

					let owner;
					if (inviteGuild.ownerID) {
						owner = this.client.users.get(inviteGuild.ownerID);
						if (!owner) {
							owner = await this.restClient.getRESTUser(inviteGuild.ownerID);
						}

						if (owner) {
							embed.fields.push({ name: 'Owner', value: this.utils.fullName(owner), inline: true });
						}
					}
				} else {
					embed.fields.push({ name: 'Dyno', value: 'Never Added', inline: true });
				}
			}

			this.logEvent(logChannel, embed, guildConfig);
		});
	}

	/**
	 * Handle command received
	 */
	public onCommand({ command, message, guildConfig }: any) {
		this.shouldLog({ event: 'commands', guild: message.channel.guild, channel: message.channel, guildConfig })
			.then(async (logChannel: eris.GuildChannel) => {
				if (!logChannel) { return; }

				if (['Manager', 'Moderator'].includes(command.group || command.module)) {
					const description = `Used \`${command.name}\` command in ${message.channel.mention}\n${message.cleanContent}`;

					const embed = {
						color: this.utils.getColor('blue'),
						description: description,
						author: {
							name: this.utils.fullName(message.author, false),
							icon_url: message.author.avatarURL,
						},
						timestamp: (new Date()).toISOString(),
					};

					this.logEvent(logChannel, embed, guildConfig);
				}
			});
	}

	/**
	 * Handle member join
	 * @param {Guild} guild Guild object
	 * @param {Member} member Member object
	 * @returns {*}
	 */
	public guildMemberAdd({ guild, member, guildConfig }: any) {
		this.shouldLog({ event: 'guildMemberAdd', guild, guildConfig }).then((logChannel: eris.GuildChannel) => {
			if (!logChannel) { return; }

			const embed = {
				color: this.utils.getColor('green'),
				author: {
					name: 'Member Joined',
					icon_url: member.avatarURL,
				},
				description: `${member.mention} ${this.utils.fullName(member)}`,
				thumbnail: null,
				fields: [],
				footer: { text: `ID: ${member.id}` },
				timestamp: (new Date()).toISOString(),
			};

			if (guildConfig.actionlog && guildConfig.actionlog.showThumb) {
				embed.thumbnail = { url: member.avatarURL };
			}

			const newAccountThreshold = guildConfig.newAccThreshold || 2;
			const diff = Date.now() - member.createdAt;

			if (guildConfig.actionlog.showAccountAge) {
				// cast as any to fix bug in typedef
				const age = (<any>moment.duration(diff / 1000, 'seconds')).format('w [weeks] d [days], h [hrs], m [min], s [sec]');
				embed.fields = [{ name: 'Account Age', value: `${age}` }];
			} else if (diff < (86400 * newAccountThreshold * 1000)) {
				// cast as any to fix bug in typedef
				const age = (<any>moment.duration(diff / 1000, 'seconds')).format('w [weeks] d [days], h [hrs], m [min], s [sec]');
				embed.fields = [{ name: 'New Account', value: `Created ${age} ago` }];
			}

			this.logEvent(logChannel, embed, guildConfig);
		});
	}

	/**
	 * Handle member leave
	 */
	public guildMemberRemove({ guild, member, guildConfig }: any) {
		this.shouldLog({ event: 'guildMemberRemove', guild, guildConfig }).then((logChannel: eris.GuildChannel) => {
			if (!logChannel) { return; }

			const index = this.bans.indexOf(`${guild.id}${member.id}`);
			if (index > -1) {
				this.bans.splice(index, 1);
				return;
			}

			const embed = {
				color: this.utils.getColor('orange'),
				author: {
					name: 'Member Left',
					icon_url: member.avatarURL,
				},
				description: `${member.mention} ${this.utils.fullName(member)}`,
				thumbnail: null,
				footer: { text: `ID: ${member.id}` },
				timestamp: (new Date()).toISOString(),
			};

			if (guildConfig.actionlog && guildConfig.actionlog.showThumb) {
				embed.thumbnail = { url: member.avatarURL };
			}

			this.logEvent(logChannel, embed, guildConfig);
		});
	}

	/**
	 * Handle member ban
	 * @param {Guild} guild Guild object
	 * @param {User} user User object
	 * @returns {*}
	 */
	public guildBanAdd({ guild, member, guildConfig }: any) {
		this.shouldLog({ event: 'guildBanAdd', guild, guildConfig }).then((logChannel: eris.GuildChannel) => {
			if (!logChannel) { return; }

			const embed = {
				color: this.utils.getColor('orange'),
				author: {
					name: 'Member Banned',
					icon_url: member.avatarURL,
				},
				thumbnail: { url: member.avatarURL },
				description: `${member.mention} ${this.utils.fullName(member)}`,
				footer: { text: `ID: ${member.id}` },
				timestamp: (new Date()).toISOString(),
			};

			this.bans.push(`${guild.id}${member.id}`);

			this.logEvent(logChannel, embed, guildConfig);
		});
	}

	/**
	 * Handle member unban
	 * @param {Guild} guild Guild object
	 * @param {User} user User object
	 * @returns {*}
	 */
	public guildBanRemove({ guild, member, guildConfig }: any) {
		this.shouldLog({ event: 'guildBanRemove', guild, guildConfig }).then((logChannel: eris.GuildChannel) => {
			if (!logChannel) { return; }

			const embed = {
				color: this.utils.getColor('blue'),
				author: {
					name: 'Member Unbanned',
					icon_url: member.avatarURL,
				},
				thumbnail: { url: member.avatarURL },
				description: `${member.mention} ${this.utils.fullName(member)}`,
				footer: { text: `ID: ${member.id}` },
				timestamp: (new Date()).toISOString(),
			};

			this.logEvent(logChannel, embed, guildConfig);
		});
	}

	/**
	 * Handle edited messages
	 * @param {Message} options.message Message object
	 * @param {Message} options.oldMessage Old message object
	 * @param {Object} options.guildConfig Guild configuration
	 */
	public async messageUpdate({ message, oldMessage, guildConfig }: any) {
		if (!message || !message.author || message.author.bot) { return; }

		if (!oldMessage) { return; }
		if (message.content === oldMessage.content) { return; }

		this.shouldLog({ event: 'messageEdit', guild: message.guild, channel: message.channel, guildConfig })
			.then((logChannel: eris.GuildChannel) => {
				if (!logChannel) { return; }

				const jumpLink = `[Jump to Message](https://discordapp.com/channels/${message.guild.id}/${message.channel.id}/${message.id})`;
				const embed = {
					color: this.utils.getColor('blue'),
					author: {
						name: this.utils.fullName(message.author, false),
						icon_url: message.author.avatarURL,
					},
					description: `**Message edited in ${message.channel.mention || '#deleted-channel'}** ${jumpLink}`,
					fields: [
						{ name: 'Before', value: oldMessage.content.length > 255 ?
							`${oldMessage.content.substr(0, 252)}...` : `${oldMessage.content}` },
						{ name: 'After', value: message.cleanContent.length > 255 ?
							`${message.cleanContent.substr(0, 252)}...` : `${message.cleanContent}` },
					],
					footer: { text: `User ID: ${message.author.id}` },
					timestamp: (new Date()).toISOString(),
				};

				this.logEvent(logChannel, embed, guildConfig);
			});
	}

	/**
	 * Handle message delete
	 * @param {Message} message Message object
	 * @returns {*}
	 */
	public async messageDelete({ message, guildConfig }: any) {
		let guild = null;
		let channel = null;

		if (!message.channel.guild) {
			if (message.channelID) {
				channel = this.client.getChannel(message.channelID);
				guild = channel.guild;
				// guild = this.client.guilds.get(this.client.channelGuildMap[message.channelID]);
			} else { return; }
		} else {
			guild = this.client.guilds.get(message.channel.guild.id);
		}

		channel = channel || message.channel;

		if (message.author && message.author.bot) {
			return;
		}

		this.shouldLog({ event: 'messageDelete', guild, channel: channel, guildConfig }).then(async (logChannel: eris.GuildChannel) => {
			if (!logChannel) { return; }

			if (!channel) {
				channel = message.channel || channel;
			}

			const authorText = message.author ? ` sent by ${message.author.mention}` : '';
			const embed = {
				color: this.utils.getColor('orange'),
				description: `**Message${authorText} deleted in ${channel.mention || '#deleted-channel'}**`,
				author: {
					name: message.author ? this.utils.fullName(message.author, false) : guild.name,
					icon_url: message.author ? message.author.avatarURL || null : guild.iconURL,
				},
				footer: { text: `Author: ${message.author ? message.author.id : '?'} | Message ID: ${message.id}` },
				timestamp: (new Date()).toISOString(),
			};

			if (message.cleanContent) {
				embed.description += '\n';
				embed.description += message.cleanContent.length > 500 ?
					`${message.cleanContent.substr(0, 497)}...` :
					message.cleanContent;
			} else if (message.content) {
				const content = message.content;
				embed.description += '\n';
				embed.description += content.length > 500 ?
					`${content.substr(0, 497)}...` :
					content;
			}

			this.logEvent(logChannel, embed, guildConfig);
		});
	}

	/**
	 * Handle message delete bulk event
	 * @param {Channel|GuildChannel} channel Channel object
	 * @param {Array} ids Array of deleted message ids
	 * @returns {*}
	 */
	public messageDeleteBulk({ channel, guild, messages, guildConfig }: any) {
		if (channel.type !== 0 || !channel.guild) {
			return;
		}

		this.shouldLog({ event: 'messageDeleteBulk', guild, channel, guildConfig }).then(async (logChannel: eris.GuildChannel) => {
			if (!logChannel) { return; }

			const embed = {
				color: this.utils.getColor('blue'),
				description: `**Bulk Delete in ${channel.mention}, ${messages.length} messages deleted**`,
				author: {
					name: guild.name,
					icon_url: guild.iconURL || null,
				},
				timestamp: (new Date()).toISOString(),
			};

			this.logEvent(logChannel, embed, guildConfig);
		});
	}

	/**
	 * Handle channel create
	 * @param {Channel|GuildChannel} channel Channel object
	 * @returns {*}
	 */
	public channelCreate({ channel, guildConfig }: any) {
		if ((channel.type !== 0 && channel.type !== 2) || !channel.guild) {
			return;
		}

		const guild = channel.guild;

		this.shouldLog({ event: 'channelCreate', guild, guildConfig }).then((logChannel: eris.GuildChannel) => {
			if (!logChannel) { return; }

			const embed = {
				color: this.utils.getColor('green'),
				description: `**Channel Created: #${channel.name}**`,
				author: {
					name: guild.name,
					icon_url: guild.iconURL || null,
				},
				footer: { text: `ID: ${channel.id}` },
				timestamp: (new Date()).toISOString(),
			};

			this.logEvent(logChannel, embed, guildConfig);
		});
	}

	/**
	 * Handle channel delete
	 * @param {Channel|GuildChannel} channel Channel object
	 * @returns {*}
	 */
	public channelDelete({ channel, guildConfig }: any) {
		if ((channel.type !== 0 && channel.type !== 2) || !channel.guild) {
			return;
		}

		const guild = channel.guild;

		this.shouldLog({ event: 'channelDelete', guild, guildConfig }).then((logChannel: eris.GuildChannel) => {
			if (!logChannel) { return; }

			const embed = {
				color: this.utils.getColor('orange'),
				description: `**Channel Deleted: #${channel.name}**`,
				author: {
					name: guild.name,
					icon_url: guild.iconURL || null,
				},
				footer: { text: `ID: ${channel.id}` },
				timestamp: (new Date()).toISOString(),
			};

			this.logEvent(logChannel, embed, guildConfig);
		});
	}

	/**
	 * Handle role create
	 * @param {Guild} guild Guild object
	 * @param {Role} role Role object
	 * @returns {*}
	 */
	public guildRoleCreate({ guild, role, guildConfig }: any) {
		this.shouldLog({ event: 'guildRoleCreate', guild, guildConfig }).then((logChannel: eris.GuildChannel) => {
			if (!logChannel) { return; }

			const embed = {
				color: this.utils.getColor('green'),
				description: `**Role Created: ${role.name}**`,
				author: {
					name: guild.name,
					icon_url: guild.iconURL || null,
				},
				footer: { text: `ID: ${role.id}` },
				timestamp: (new Date()).toISOString(),
			};

			if (role.name === 'new role') {
				this.roles.set(role.id, { logChannel, embed });
				return;
			}

			this.logEvent(logChannel, embed, guildConfig);
		});
	}

	/**
	 * Handle role update
	 * @param {Guild} guild Guild Object
	 * @param {Role} role Role Object
	 * @param {Object} oldRole Old role object
	 * @returns {*}
	 */
	public guildRoleUpdate({ guild, role, oldRole, guildConfig }: any) {
		if (!role || !role.hasOwnProperty('id')) {
			return;
		}

		const createdRole = this.roles.get(role.id);
		if (createdRole) {
			return this.logEvent(createdRole.logChannel, createdRole.embed, guildConfig)
				.then(() => this.roles.delete(role.id));
		}

		this.shouldLog({ event: 'guildRoleUpdate', guild, guildConfig }).then((logChannel: eris.GuildChannel) => {
			if (!logChannel) { return; }

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
	public roleUpdate(e: any) {
		const embed = {
			color: this.utils.getColor('blue'),
			description: `**Role ${this.utils.ucfirst(e.event)} Changed: ${e.oldRole[e.event]} -> ${e.role[e.event]}**`,
			author: {
				name: e.guild.name,
				icon_url: e.guild.iconURL || null,
			},
			footer: { text: `ID: ${e.role.id}` },
			timestamp: (new Date()).toISOString(),
		};

		return this.logEvent(e.logChannel, embed, e.guildConfig);
	}

	/**
	 * Handle role delete
	 * @param {Guild} guild Guild object
	 * @param {Role} role Role object
	 * @returns {*}
	 */
	public guildRoleDelete({ guild, role, guildConfig }: any) {
		this.shouldLog({ event: 'guildRoleDelete', guild, guildConfig }).then((logChannel: eris.GuildChannel) => {
			if (!logChannel) { return; }

			const embed = {
				color: this.utils.getColor('orange'),
				description: `**Role Deleted: ${role.name || 'unknown'}**`,
				author: {
					name: guild.name,
					icon_url: guild.iconURL || null,
				},
				footer: { text: `ID: ${role.id}` },
				timestamp: (new Date()).toISOString(),
			};

			this.logEvent(logChannel, embed, guildConfig);
		});
	}

	/**
	 * Handle guild member update
	 * @param {Guild} guild Guild Object
	 * @param {Member} member Member Object
	 * @param {Object} oldMember Old member object
	 */
	public guildMemberUpdate({ guild, member, oldMember, guildConfig }: any) {
		if (!oldMember) {
			oldMember = Object.assign({}, member, { nick: 'None' });
		}

		if (member.nick !== oldMember.nick) {
			this.nickChange({ guild, member, oldMember, guildConfig });
		}

		if (member.roles !== oldMember.roles) {
			const addedRoles = member.roles.filter((r: string) => !oldMember.roles.includes(r));
			const removedRoles = oldMember.roles.filter((r: string) => !member.roles.includes(r));

			if (addedRoles.length) {
				this.memberRoleAdd({ guild, member, addedRoles, guildConfig });
			}
			if (removedRoles.length) {
				this.memberRoleRemove({ guild, member, removedRoles, guildConfig });
			}
		}
	}

	/**
	 * Handle nickname change
	 * @param {Guild} guild Guild Object
	 * @param {Member} member Member Object
	 * @param {Object} oldMember Old member object
	 * @returns {*}
	 */
	public nickChange({ guild, member, oldMember, guildConfig }: any) {
		this.shouldLog({ event: 'nickChange', guild, guildConfig }).then((logChannel: eris.GuildChannel) => {
			if (!logChannel) { return; }

			const embed = {
				color: this.utils.getColor('blue'),
				description: `**${member.mention} nickname changed**`,
				author: {
					name: this.utils.fullName(member, false),
					icon_url: member.avatarURL,
				},
				fields: [
					{ name: 'Before', value: oldMember.nick || 'None' },
					{ name: 'After', value: member.nick || 'None' },
				],
				footer: { text: `ID: ${member.id}` },
				timestamp: (new Date()).toISOString(),
			};

			this.logEvent(logChannel, embed, guildConfig);
		});
	}

	/**
	 * Handle member added to a role
	 * @param {Guild} guild Guild Object
	 * @param {Member} member Member Object
	 * @param {String} roleId Role ID
	 * @returns {*}
	 */
	public memberRoleAdd({ guild, member, addedRoles, guildConfig }: any) {
		this.shouldLog({ event: 'memberRoleAdd', guild, guildConfig }).then((logChannel: eris.GuildChannel) => {
			if (!logChannel) { return; }

			const roles: eris.Role[] = addedRoles.map((id: string) => guild.roles.get(id));
			if (!roles || !roles.length) { return; }
			let embed: eris.EmbedBase = {};

			if (roles.length === 1) {
				const role = roles[0];
				embed = {
					color: this.utils.getColor('blue'),
					description: `**${member.mention} was given the \`${role.name}\` role**`,
					author: {
						name: this.utils.fullName(member, false),
						icon_url: member.avatarURL,
					},
					footer: { text: `ID: ${member.id}` },
					timestamp: (new Date()).toISOString(),
				};
			} else {
				const roleText = `\`${roles.map((r: eris.Role) => r.name).join('`, `')}\``;
				embed = {
					color: this.utils.getColor('blue'),
					description: `**${member.mention} was given the roles ${roleText}**`,
					author: {
						name: this.utils.fullName(member, false),
						icon_url: member.avatarURL,
					},
					footer: { text: `ID: ${member.id}` },
					timestamp: (new Date()).toISOString(),
				};
			}

			this.logEvent(logChannel, embed, guildConfig);
		});
	}

	/**
	 * Handle member removed from a role
	 * @param {Guild} guild Guild Object
	 * @param {Member} member Member Object
	 * @param {String} roleId Role ID
	 * @returns {*}
	 */
	public memberRoleRemove({ guild, member, removedRoles, guildConfig }: any) {
		this.shouldLog({ event: 'memberRoleRemove', guild, guildConfig }).then((logChannel: eris.GuildChannel) => {
			if (!logChannel) { return; }

			const roles: eris.Role[] = removedRoles.map((id: string) => guild.roles.get(id));
			if (!roles || !roles.length) { return; }
			let embed: eris.EmbedBase = {};

			if (roles.length === 1) {
				const role = roles[0];
				embed = {
					color: this.utils.getColor('blue'),
					description: `**${member.mention} was removed from the \`${role.name}\` role**`,
					author: {
						name: this.utils.fullName(member, false),
						icon_url: member.avatarURL,
					},
					footer: { text: `ID: ${member.id}` },
					timestamp: (new Date()).toISOString(),
				};
			} else {
				const roleText = `\`${roles.map((r: eris.Role) => r.name).join('`, `')}\``;
				embed = {
					color: this.utils.getColor('blue'),
					description: `**${member.mention} was removed the roles ${roleText}**`,
					author: {
						name: this.utils.fullName(member, false),
						icon_url: member.avatarURL,
					},
					footer: { text: `ID: ${member.id}` },
					timestamp: (new Date()).toISOString(),
				};
			}

			this.logEvent(logChannel, embed, guildConfig);
		});
	}

	/**
	 * Handle username change
	 * @param {Guild} guild Guild Object
	 * @param {User} user User Object
	 * @param {Object} oldUser Old user object
	 * @returns {*}
	 */
	public userChange({ guild, user, oldUser, guildConfig }: any) {
		this.shouldLog({ event: 'userChange', guild, guildConfig }).then((logChannel: eris.GuildChannel) => {
			if (!logChannel) { return; }

			const embed = {
				color: this.utils.getColor('blue'),
				description: `**${user.mention} username changed**`,
				author: {
					name: this.utils.fullName(user, false),
					icon_url: user.avatarURL,
				},
				fields: [
					{ name: 'Before', value: this.utils.fullName(oldUser) || 'None' },
					{ name: 'After', value: this.utils.fullName(user) || 'None' },
				],
				footer: { text: `ID: ${user.id}` },
				timestamp: (new Date()).toISOString(),
			};

			this.logEvent(logChannel, embed, guildConfig);
		});
	}

	/**
	 * Handle voice channel join
	 * @param {Member} member Guild member
	 * @param {GuildChannel) channel Voice channel
	 * @returns {*}
	 */
	public voiceChannelJoin({ guild, member, channel, guildConfig }: any) {
		this.shouldLog({ event: 'voiceChannelJoin', guild, guildConfig }).then((logChannel: eris.GuildChannel) => {
			if (!logChannel) { return; }

			const embed = {
				color: this.utils.getColor('green'),
				description: `**${member.mention} joined voice channel ${channel.mention || channel.name}**`,
				author: {
					name: this.utils.fullName(member, false),
					icon_url: member.avatarURL || null,
				},
				footer: { text: `ID: ${member.id}` },
				timestamp: (new Date()).toISOString(),
			};

			this.logEvent(logChannel, embed, guildConfig);
		});
	}

	/**
	 * Handle voice channel leave
	 * @param {Member} member Guild member
	 * @param {GuildChannel) channel Voice channel
	 * @returns {*}
	 */
	public voiceChannelLeave({ guild, member, channel, guildConfig }: any) {
		this.shouldLog({ event: 'voiceChannelLeave', guild, guildConfig }).then((logChannel: eris.GuildChannel) => {
			if (!logChannel) { return; }

			const embed = {
				color: this.utils.getColor('green'),
				description: `**${member.mention} left voice channel ${channel.mention || channel.name}**`,
				author: {
					name: this.utils.fullName(member, false),
					icon_url: member.avatarURL || null,
				},
				footer: { text: `ID: ${member.id}` },
				timestamp: (new Date()).toISOString(),
			};

			this.logEvent(logChannel, embed, guildConfig);
		});
	}

	/**
	 * Handle voice chanel switch
	 * @param {Member} member Guild member
	 * @param {GuildChannel} channel New voice channel
	 * @param {GuildChannel} oldChannel Old voice channel
	 * @returns {*}
	 */
	public voiceChannelSwitch({ guild, member, channel, oldChannel, guildConfig }: any) {
		this.shouldLog({ event: 'voiceChannelSwitch', guild, guildConfig }).then((logChannel: eris.GuildChannel) => {
			if (!logChannel) { return; }

			const embed = {
				color: this.utils.getColor('green'),
				description: `**${member.mention} switched voice channel \`#${oldChannel.name}\` -> \`#${channel.name}\`**`,
				author: {
					name: this.utils.fullName(member, false),
					icon_url: member.avatarURL || null,
				},
				footer: { text: `ID: ${member.id}` },
				timestamp: (new Date()).toISOString(),
			};

			this.logEvent(logChannel, embed, guildConfig);
		});
	}

	/**
	 * Determine if an event should be logged
	 */
	private shouldLog(e: any): Promise<eris.GuildChannel> {
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
					if (!this.isEnabled(guild, this, config)) {
						return resolve(null);
					}

					e.guildConfig = config;

					return this.shouldLog(e);
				}).catch(() => resolve(null));
			});
		}

		if (!this.isEnabled(guild, this, guildConfig)) {
			return Promise.resolve(null);
		}

		if (!guildConfig.actionlog || !guildConfig.actionlog[event])  {
			return Promise.resolve(null);
		}

		if (!guildConfig.actionlog.channel && typeof guildConfig.actionlog[event] !== 'string') {
			return Promise.resolve(null);
		}

		if (channel && guildConfig.actionlog.ignoredChannels && guildConfig.actionlog.ignoredChannels.length) {
			if (guildConfig.actionlog.ignoredChannels.find((c: any) => c.id === channel.id || (channel.parentID && channel.parentID === c.id))) {
				return Promise.resolve(null);
			}
		}

		const logChannel = typeof guildConfig.actionlog[event] === 'string' ?
			guildConfig.actionlog[event] :
			guildConfig.actionlog.channel;

		this.dyno.internalEvents.emit('actionlog', { type: event, guild: guild });

		return Promise.resolve(this.client.getChannel(logChannel));
	}

	/**
	 * Log an event to a channel
	 */
	private logEvent(channel: eris.AnyGuildChannel, embed: eris.EmbedBase, guildConfig: dyno.GuildConfig): Promise<any> {
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

		if (channel.type !== 0) {
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

	private clearBans() {
		this.bans = [];
	}

	private cleanup() {
		this.invites = new Set();
	}
}

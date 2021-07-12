import {Base, Role} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as each from 'async-each';
import * as dyno from 'Dyno';
import * as moment from 'moment';

const helpText = 'Make sure the Dyno role has `Manage Roles` and `Manage Channels` permissions.';
const permError = `I don't have enough permissions. ${helpText}`;
const modError = `That user is a mod/admin, I can't do that.`;
const hierarchyError = `My role isn't high enough to moderate this user. Move the Dyno role up above other roles.`;
const createError = `I can't create the Muted role. ${helpText}`;
const protectedError = `That user is protected, I can't do that.`;
const dmError = `I wasn't able to warn that user, they may have DM's disabled.`;

/**
 * Moderation utils
 * @class ModUtils
 * @extends Base
 */
export default class ModUtils extends Base {
	/**
	 * Create muted role
	 */
	public async createMutedRole(guild: eris.Guild, guildConfig: dyno.GuildConfig, _role?: Role): Promise<eris.Role> {
		const options = {
			name: 'Muted',
			color: this.utils.hexToInt('#818386'),
		};

		_role = _role || new Role(this.dyno, guild);

		let role: eris.Role;
		try {
			role = await _role.getOrCreate(options);
		} catch (e) {
			return Promise.resolve(null);
		}

		if (role == undefined) {
			return;
		}

		// set muted role id
		guildConfig.moderation = guildConfig.moderation || {};
		guildConfig.moderation.mutedRole = role.id;

		this.dyno.guilds.update(guild.id, { $set: { 'moderation.mutedRole': role.id } })
			.then(() => this.logger.info(`Server: ${guild.id}, Created Muted role for server ${guild.name}.`))
			.catch((err: any) => this.logger.error(err, {
				type: 'moderation.createMutedRole.guilds.update',
				guild: guild.id,
				shard: guild.shard.id,
			}));

		// Verify overwrite permissions are enabled for each channel
		_role.createOverwritePermissions(role.id, [...guild.channels.values()], [
			'sendMessages',
			'addReactions',
			'voiceSpeak',
		]);

		return Promise.resolve(role);
	}

	/**
	 * Create a timed moderation
	 */
	public createModeration(
		msg: eris.Message,
		user: UserOrMember,
		mod: eris.User,
		type: string,
		limit: number,
		role?: eris.Role,
		options?: any,
	) {
		options = options || {};

		const doc: ModerationDoc = Object.assign({
			server : (<eris.GuildChannel>msg.channel).guild.id,
			channel: msg.channel.id,
			userid : user.id,
			user   : { id: user.id, name: user.username, discrim: user.discriminator },
			mod    : mod.id,
			type   : type,
		}, options);

		if (role) {
			doc.role = role.id;
		}

		if (limit) {
			doc.completedAt = moment().add(limit, 'minutes');
		}

		const moderation = new this.models.Moderation(doc);
		moderation.save((err: any) => {
			if (err) {
				return this.logger.error(err, {
					type: 'moderation.create.save',
					guild: (<eris.GuildChannel>msg.channel).guild.id,
					shard: (<eris.GuildChannel>msg.channel).guild.shard.id,
				});
			}

			return this.logger.info(`Created moderation: ${type}, limit: ${limit}, completed at ${doc.completedAt}`);
		});
	}

	public async getModeration(guild: eris.Guild, user: UserOrMember, type: string) {
		try {
			return await this.models.Moderation.findOne({
				server: guild.id,
				userid: user.id,
				type: type,
			}).lean().exec();
		} catch (err) {
			this.logger.error(err);
			return null;
		}
	}

	public async getModerations(guild: eris.Guild, user: UserOrMember, type: string, query: any = {}) {
		try {
			query = Object.assign({
				server: guild.id,
				userid: user.id,
			}, query);

			if (type) {
				query.type = type;
			}

			return await this.models.Moderation.find(query).lean().exec();
		} catch (err) {
			this.logger.error(err);
			return null;
		}
	}

	/**
	 * Remove a moderation
	 * @param {Message} msg Message object
	 */
	public removeModeration(guild: eris.Guild, user: eris.User|eris.Member, type: string, query: any = {}) {
		query = Object.assign({
			server: guild.id,
			userid: user.id,
			type: type,
			createdAt: { $exists: true }
		}, query);

		this.models.Moderation.remove(query).catch(() => false);
	}

	/**
	 * Log moderation event
	 */
	public async log(event: ModerationEvent) {
		const { type, user, guild, mod, limit, role, reason, guildConfig, colorOverride } = event;

		guildConfig.moderation = guildConfig.moderation || {};
		guildConfig.moderation.count = (guildConfig.moderation.count || 0) + 1;

		this.dyno.guilds.update(guild.id, { $inc: { 'moderation.count': 1 } })
			.catch((err: any) => this.logger.error(err, {
				type: 'moderation.log.guilds.update',
				guild: guild.id,
				shard: guild.shard.id,
			}));

		const colorMap = [
			['ban', this.utils.getColor('red')],
			['softban', this.utils.getColor('red')],
			['mute', this.utils.getColor('orange')],
			['kick', this.utils.getColor('red')],
			['warn', this.utils.getColor('yellow')],
			['unban', this.utils.getColor('yellow')],
			['unmute', this.utils.getColor('green')],
			['clearwarn', this.utils.getColor('green')],
			['role', this.utils.getColor('yellow')],
		];

		const caseNum = guildConfig.moderation.count;
		const userString = typeof user === 'string' ? user : this.utils.fullName(user);
		const avatarURL = user.avatarURL || (user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.jpg` : null);

		let message;

		if (guildConfig.moderation.channel) {
			const channel = this.client.getChannel(guildConfig.moderation.channel);
			if (!channel) {
				return;
			}

			const modtype = type.split(' ').shift().toLowerCase();

			const foundColor = colorMap.find((c: any[]) => modtype.startsWith(c[0]));
			let color = foundColor ? foundColor[1] : this.utils.getColor('orange');
			color = colorOverride || color;

			const embed = {
				color: color,
				author: { name: `Case ${caseNum} | ${type} | ${userString}`, icon_url: avatarURL },
				fields: [
					{ name: 'User', value: `${user.mention || this.utils.fullName(user)}`, inline: true },
					{ name: 'Moderator', value: mod ? mod.mention : `<@${this.dyno.userid}>`, inline: true },
				],
				footer: { text: `ID: ${user.id}` },
				timestamp: (new Date()).toISOString(),
			};

			if (limit) {
				embed.fields.push({ name: 'Length', value: `${limit} minutes`, inline: true });
			}
			if (role) {
				embed.fields.push({ name: 'Role', value: `${role.name}`, inline: true });
			}
			if (reason) {
				embed.fields.push({ name: 'Reason', value: reason, inline: true });
			}

			message = await this.sendMessage(channel, { embed });
		}

		const doc = {
			caseNum: caseNum,
			server: guild.id,
			type: type,
			user: {},
			mod: {},
			reason: reason || 'None',
			message: message ? message.id || null : null,
			v: 2,
		};

		doc.user = {
			id: user.id,
			username: user.username,
			discriminator: user.discriminator,
			avatarURL: avatarURL,
		};

		if (mod) {
			doc.mod = {
				id: mod.id,
				username: mod.username,
				discriminator: mod.discriminator,
				avatarURL: mod.avatarURL,
			};
		}

		const log = new this.models.ModLog(doc);
		log.save((err: any) => err ? this.logger.error(err, {
			type: 'moderation.log.save',
			guild: guild.id,
			shard: guild.shard.id,
		}) : false);
	}

	/**
	 * Log moderation event
	 */
	public async channelLog(event: ModerationEvent) {
		const { type, user, guild, limit, channel, guildConfig, colorOverride } = event;

		guildConfig.moderation = guildConfig.moderation || {};

		const colorMap = [
			['lock', this.utils.getColor('red')],
			['unlock', this.utils.getColor('green')],
		];

		const userString = typeof user === 'string' ? user : this.utils.fullName(user);
		const avatarURL = user.avatarURL || (user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.jpg` : null);

		if (!guildConfig.moderation.channel) {
			return;
		}

		const logChannel = this.client.getChannel(guildConfig.moderation.channel);
		if (!logChannel) {
			return;
		}

		const modtype = type.split(' ').shift().toLowerCase();

		const foundColor = colorMap.find((c: any[]) => modtype.startsWith(c[0]));
		let color = foundColor ? foundColor[1] : this.utils.getColor('orange');
		color = colorOverride || color;

		const embed = {
			color: color,
			author: { name: `${type} | ${userString}`, icon_url: avatarURL },
			fields: [
				{ name: 'Channel', value: `${channel.name}`, inline: true },
				{ name: 'Moderator', value: user ? user.mention : `<@${this.dyno.userid}>`, inline: true },
			],
			footer: { text: `ID: ${channel.id}` },
			timestamp: (new Date()).toISOString(),
		};

		if (limit) {
			embed.fields.push({ name: 'Length', value: `${limit} minutes`, inline: true });
		}

		const message = await this.sendMessage(logChannel, { embed });
	}

	/**
	 * Kick a user
	 */
	public async kickMember(
		guild: eris.Guild,
		message: eris.Message,
		member: UserOrMember,
		guildConfig: dyno.GuildConfig,
		reason?: string,
	): Promise<string> {
		if (!member) {
			return Promise.reject(`I can't find that user to kick.`);
		}

		const stopError = this.stopModeration('kick', message, member, guildConfig, 'kickMembers');
		if (stopError) {
			return Promise.reject(stopError);
		}

		// set the reason if it doesn't exist
		reason = reason || 'No reason given.';

		if (guildConfig.moderation && guildConfig.moderation.dmBans) {
			const caseNum = guildConfig.moderation.count;
			this.dmUser(guildConfig, member, `You were kicked from ${guild.name}`, reason, caseNum, 'kick');
		}

		try {
			await this.client.kickGuildMember(guild.id, member.id, encodeURIComponent(reason));

			this.log({
				type: 'Kick',
				user: member,
				guild: guild,
				mod: message.author,
				limit: null,
				reason: reason,
				guildConfig: guildConfig,
			});

			this.deleteCommand(message, guildConfig);

			return Promise.resolve(this.getCustomResponse(this.utils.fullName(member), 'kickMessage', guildConfig, reason));
		} catch {
			return Promise.reject(`I can't kick ${this.utils.fullName(member)}`);
		}
	}

	/**
	 * Ban a user
	 */
	public async banMember(
		guild: eris.Guild,
		message: eris.Message,
		user: string|UserOrMember,
		guildConfig: dyno.GuildConfig,
		reason?: string,
		limit?: number,
		preserve?: boolean,
	): Promise<string> {
		let bannedUser: BannedUser;

		if (typeof user === 'string') {
			if (this.client.users.has(user)) {
				user = this.client.users.get(user);
			} else {
				user = new eris.User({
					id: user,
				}, this.client);
			}
		}

		const userObject: eris.User = <eris.User>user;

		const stopError = this.stopModeration('ban', message, user, guildConfig, 'banMembers');
		if (stopError) {
			return Promise.reject(stopError);
		}

		// set the reason if it doesn't exist
		reason = reason || 'No reason given.';

		if (guildConfig.moderation && guildConfig.moderation.dmBans) {
			if (guild.members.has(userObject.id)) {
				const caseNum = guildConfig.moderation.count;
				this.dmUser(guildConfig, <eris.User>user, `You were banned from ${guild.name}`, reason, caseNum, 'ban', limit);
			}
		}

		if (userObject.username != undefined) {
			bannedUser = {
				id: userObject.id,
				username: userObject.username,
				discriminator: userObject.discriminator,
				avatarURL: userObject.avatarURL,
				mention: userObject.mention,
			};
		}

		try {
			let days = guildConfig.moderation && guildConfig.moderation.disableDelete ? null : 7;
			if (preserve) {
				days = null;
			}

			await this.client.banGuildMember(guild.id, userObject.id, days, encodeURIComponent(reason));
			if (!bannedUser) {
				const ban = await this.client.getGuildBan(guild.id, userObject.id).catch(() => false).then((d: ErisBan) => ban.user || ban);
				if (ban) {
					bannedUser = ban;
				}
			}

			if (!bannedUser) {
				userObject.username = 'Unknown';
				userObject.discriminator = '0000';
				bannedUser = userObject;
			}

			this.log({
				type: 'Ban',
				user: bannedUser,
				guild: guild,
				mod: message.author,
				limit: limit,
				reason: reason,
				guildConfig: guildConfig,
			});

			if (limit) {
				if (isNaN(limit)) {
					return Promise.reject('Please use a valid limit less than 7 days. ex. 3m, 2h, 1d');
				}
				this.createModeration(message, userObject, message.author, 'ban', limit);
			}

			this.deleteCommand(message, guildConfig);

			const response = this.getCustomResponse(this.utils.fullName(bannedUser), 'banMessage', guildConfig, reason);
			return Promise.resolve(response);
		} catch {
			return Promise.reject(`I can't ban ${this.utils.fullName(user)}`);
		}
	}

	/**
	 * Unban a user
	 */
	public async unbanMember(
		guild: eris.Guild,
		message: eris.Message,
		search: string,
		guildConfig: dyno.GuildConfig,
		reason?: string,
	): Promise<string> {
		let bannedUser: eris.User;

		if (typeof search !== 'string') {
			return Promise.reject(`Invalid user.`);
		}

		try {
			const bans = await this.client.getGuildBans(guild.id).catch(() => false)
				.then((d: ErisBan[]) => d.map((ban: ErisBan) => ban.user || ban));

			if (bans) {
				const [user, discrim] = search.split('#');
				if (discrim) {
					bannedUser = bans.find((u: eris.User) => u.username === user && u.discriminator === discrim);
				} else {
					bannedUser = bans.find((u: eris.User) => u.id === user || u.username === search);
				}
			}
		} catch (err) {
			return Promise.reject(`I can't get server bans, make sure I have Manage Server/Ban Members permissions.`);
		}

		if (!bannedUser || !bannedUser.id) {
			return Promise.reject(`I can't find that user.`);
		}

		if (search === this.client.user.id || search === message.author.id) {
			return Promise.reject(`That user isn't banned.`);
		}

		const missingPermissions = this.missingPermissions(guild, 'banMembers');
		if (missingPermissions) {
			return `I'm missing the following permissions: ${missingPermissions.map((perm: string) => this.config.permissionsMap[perm])}`;
		}

		try {
			await this.client.unbanGuildMember(guild.id, bannedUser.id, reason);

			this.log({
				type: 'Unban',
				user: bannedUser,
				guild: guild,
				mod: message.author,
				reason: reason,
				guildConfig: guildConfig,
			});

			this.deleteCommand(message, guildConfig);
			this.removeModeration(guild, bannedUser, 'ban');
			return Promise.resolve(this.getCustomResponse(this.utils.fullName(bannedUser), 'unbanMessage', guildConfig, reason));
		} catch (err) {
			return Promise.reject(`I can't unban ${this.utils.fullName(bannedUser)}`);
		}
	}

	/**
	 * Softban a user
	 */
	public async softbanMember(
		guild: eris.Guild,
		message: eris.Message,
		member: UserOrMember,
		guildConfig: dyno.GuildConfig,
		reason?: string,
	): Promise<string> {
		const stopError = this.stopModeration('softban', message, member, guildConfig, 'banMembers');
		if (stopError) {
			return Promise.reject(stopError);
		}

		// set the reason if it doesn't exist
		reason = reason || 'No reason given.';

		if (guildConfig.moderation && guildConfig.moderation.dmBans) {
			if (guild.members.has(member.id)) {
				const caseNum = guildConfig.moderation.count;
				this.dmUser(guildConfig, member, `You were kicked from ${guild.name}`, reason, caseNum, 'kick');
			}
		}

		try {
			await this.client.banGuildMember(guild.id, member.id, 7, encodeURIComponent(reason));
			await this.client.unbanGuildMember(guild.id, member.id, `Ban was a softban`);
			this.log({
				type: 'Softban',
				guild: guild,
				mod: message.author,
				limit: null,
				user: member,
				reason: reason,
				guildConfig: guildConfig,
			});

			this.deleteCommand(message, guildConfig);
			return Promise.resolve(this.getCustomResponse(this.utils.fullName(member), 'softbanMessage', guildConfig, reason));
		} catch {
			Promise.reject(`I can't ban ${this.utils.fullName(member)}`);
		}
	}

	/**
	 * Mute a user for a period of time
	 */
	public async muteMember(
		guild: eris.Guild,
		message: eris.Message,
		member: UserOrMember,
		guildConfig: dyno.GuildConfig,
		limit?: number,
		reason?: string,
	): Promise<string> {
		let role = guildConfig.moderation ?
			guild.roles && guild.roles.find((r: eris.Role) => r.id === guildConfig.moderation.mutedRole || null) :
			null;

		const stopError = this.stopModeration('mute', message, member, guildConfig, 'manageRoles', 'manageChannels');
		if (stopError) {
			return Promise.reject(stopError);
		}

		// create the muted role if it doesn't exist
		if (!guildConfig.moderation || !role) {
			role = await this.createMutedRole(guild, guildConfig);
		}

		if (!role) {
			return Promise.reject(createError);
		}

		if (member.roles.includes(role.id)) {
			return Promise.reject(`${this.utils.fullName(member)} is already muted.`);
		}

		const hasRoleHierarchy = this.hasRoleHierarchy(guild, role);
		if (!hasRoleHierarchy) {
			return Promise.reject(hierarchyError);
		}

		this.deleteCommand(message, guildConfig);

		const options: any = {};
		let roles = [...member.roles];

		if (guildConfig.moderation.removeRoles) {
			const managedRoles = guild.roles.filter((r: eris.Role) => r.managed).map((r: eris.Role) => r.id);

			roles = roles.filter((id: string) => managedRoles.includes(id));

			options.roles = member.roles.filter((id: string) => !roles.includes(id));
		}

		roles.push(role.id);

		if (limit) {
			if (isNaN(limit)) {
				return Promise.reject('Please use a valid limit less than 7 days. ex. 3m, 2h, 1d');
			}
			this.createModeration(message, member, message.author, 'mute', limit, null, options);
		} else {
			this.createModeration(message, member, message.author, 'role', null, role);
		}

		const _role = new Role(this.dyno, guild);
		_role.createOverwritePermissions(role.id, [...guild.channels.values()], [
			'sendMessages',
			'addReactions',
			'voiceSpeak',
		]);

		const payload: any = { roles };

		if (this.hasPermissions(guild, 'voiceMuteMembers') && member.voiceState && member.voiceState.channelID) {
			payload.mute = true;
		}

		try {
			await this.client.editGuildMember(guild.id, member.id, payload);

			this.log({
				type: 'Mute',
				user: member,
				guild: guild,
				mod: message.author,
				limit: limit,
				reason: reason,
				guildConfig: guildConfig,
			});

			if (guildConfig.moderation && guildConfig.moderation.dmBans) {
				const caseNum = guildConfig.moderation.count;
				this.dmUser(guildConfig, member, `You were muted in ${guild.name}`, reason, caseNum, 'mute', limit);
			}

			return Promise.resolve(this.getCustomResponse(this.utils.fullName(member), 'muteMessage', guildConfig, reason));
		} catch (err) {
			this.logger.error(err);
			return Promise.reject(`I couldn't mute the user. ${helpText}`);
		}
	}

	/**
	 * Unmute a user
	 */
	public async unmuteMember(
		guild: eris.Guild,
		message: eris.Message,
		member: UserOrMember,
		guildConfig: dyno.GuildConfig,
		reason?: string,
	): Promise<string> {
		let role;

		if (!guildConfig.moderation || !guildConfig.moderation.mutedRole) {
			return Promise.reject(`I can't unmute ${this.utils.fullName(member)}, they aren't muted by the bot.`);
		}

		const stopError = this.stopModeration('unmute', message, member, guildConfig, 'manageRoles');
		if (stopError) {
			return Promise.reject(stopError);
		}

		role = guild.roles && guild.roles.find((r: eris.Role) => r.id === guildConfig.moderation.mutedRole);
		if (!role) {
			return Promise.reject(`I couldn't find the Muted role.`);
		}

		let roles = [...member.roles];

		if (guildConfig.moderation.removeRoles) {
			try {
				const moderation = await this.getModeration(guild, member, 'mute');
				if (moderation && moderation.roles) {
					roles = roles.concat(moderation.roles);
				}
			} catch (err) {
				return Promise.reject(`Something went wrong.`);
			}
		}

		const index = roles.indexOf(role.id);

		if (index === -1) {
			return Promise.reject(`I can't unmute ${this.utils.fullName(member)}, they aren't muted.`);
		}

		roles.splice(index, 1);

		const payload: any = { roles };

		if (this.hasPermissions(guild, 'voiceMuteMembers') && member.voiceState && member.voiceState.channelID) {
			payload.mute = false;
		}

		try {
			await this.client.editGuildMember(guild.id, member.id, payload);

			this.log({
				type: 'Unmute',
				guild: guild,
				mod: message.author,
				limit: null,
				reason: reason,
				user: member,
				guildConfig,
			});

			this.deleteCommand(message, guildConfig);
			this.removeModeration(guild, member, 'mute');
			this.removeModeration(guild, member, 'role', { role });
			return Promise.resolve(this.getCustomResponse(this.utils.fullName(member), 'unmuteMessage', guildConfig, reason));
		} catch {
			return Promise.reject(`I can't unmute ${this.utils.fullName(member)}.`);
		}
	}

	/**
	 * Warn a user for a specified reason
	 */
	public async warnMember(
		guild: eris.Guild,
		message: eris.Message,
		member: UserOrMember,
		guildConfig: dyno.GuildConfig,
		reason?: string,
	): Promise<string> {
		const user = (<eris.Member>member).user ? (<eris.Member>member).user.toJSON() : member.toJSON();
		reason = reason || 'No reason given.';

		let warned = true;

		if (user === this.client.user.id || user === message.author.id) {
			return Promise.reject(`I can't warn ${this.utils.fullName(user)}`);
		}

		try {
			const channel = await this.client.getDMChannel(user.id);
			if (!channel) {
				this.logger.error(`Channel is undefined or null ${this.client.privateChannelMap[user.id]}`);
				return Promise.reject(dmError);
			}
			let text = `You were warned in ${guild.name}`;
			if (reason) {
				text += ` for: ${reason}`;
			}

			await this.client.createMessage(channel.id, text);
		} catch {
			warned = false;
			// return Promise.reject(dmError);
		}

		this.log({
			type: 'Warn',
			guild: guild,
			mod: message.author,
			limit: null,
			user, reason, guildConfig,
		});

		const doc = new this.models.Warning({
			guild: guild.id,
			user: user,
			mod: message.author.toJSON(),
			reason: reason,
		});

		doc.save();
		this.deleteCommand(message, guildConfig);

		const msg = warned ?
			`${this.utils.fullName(user)} has been warned.` :
			`Warning logged for ${this.utils.fullName(user)}. They were not warned.`;

		return Promise.resolve(this.getResponse(msg, guildConfig, reason));
	}

	public async unwarnMember(
		guild: eris.Guild,
		message: eris.Message,
		guildConfig: dyno.GuildConfig,
		id: string,
	): Promise<string> {
		try {
			const doc = await this.models.Warning.findOne({ _id: id }).lean().exec();
			if (!doc) {
				return Promise.reject(`I couldn't find that warning.`);
			}

			let user = this.resolveUser(guild, doc.user.id, null, true);
			if (!user) {
				user = doc.user;
			}

			await this.models.Warning.remove({ _id: id });
			return Promise.resolve(`Deleted warning ${id} for ${this.utils.fullName(user)}`);
		} catch (err) {
			return Promise.reject(`Something went wrong.`);
		}
	}

	/**
	 * Note a user
	 */
	public async noteMember(
		guild: eris.Guild,
		message: eris.Message,
		member: UserOrMember,
		guildConfig: dyno.GuildConfig,
		note?: string,
	): Promise<string> {
		const user = (<eris.Member>member).user ? (<eris.Member>member).user.toJSON() : member.toJSON();
		note = note || 'No note given.';

		try {
			let doc = await this.models.Note.findOne({
				guild: guild.id,
				userid: user.id,
			}).exec();

			if (!doc) {
				doc = new this.models.Note({
					guild: guild.id,
					userid: user.id,
					user: user,
					notes: [],
				});
			}

			if (doc.notes.length >= 10) {
				return Promise.reject(`User has too many notes, delete one before adding another.`);
			}

			const noteDoc = {
				mod: message.author.toJSON(),
				note,
				createdAt: (new Date()).toISOString(),
			};

			doc.notes.push(noteDoc);
			doc.save();

			this.deleteCommand(message, guildConfig);

			const msg = `Note added for ${this.utils.fullName(user)}.`;

			return Promise.resolve(msg);
		} catch (err) {
			this.logger.error(err);
			return Promise.reject('Something went wrong.');
		}
	}

	public async unnoteMember(
		guild: eris.Guild,
		message: eris.Message,
		member: UserOrMember,
		guildConfig: dyno.GuildConfig,
		index: number,
	) {
		const user = (<eris.Member>member).user ? (<eris.Member>member).user.toJSON() : member.toJSON();

		try {
			const doc = await this.models.Note.findOne({
				guild: guild.id,
				userid: user.id,
			}).exec();

			if (!doc || !doc.notes || !doc.notes.length) {
				return Promise.reject(`There are no notes for that user.`);
			}

			const note = doc.notes[index];

			if (!this.isServerAdmin(member, message.channel) && note.mod.id !== message.author.id) {
				return Promise.reject(`You don't have permissions to delete that note.`);
			}

			doc.notes.splice(index, 1);

			doc.save();

			return Promise.resolve(`Removed note from ${this.utils.fullName(user)}`);
		} catch (err) {
			this.logger.error(err);
			return Promise.reject('Something went wrong.');
		}
	}

	/**
	 * Assign a role that will persist if they leave the server and rejoin
	 */
	public async persistRole(
		guild: eris.Guild,
		message: eris.Message,
		member: eris.Member,
		role: eris.Role,
		guildConfig: dyno.GuildConfig,
		limit?: number,
		reason?: string,
		temp?: boolean,
		add?: boolean,
		remove?: boolean,
	): Promise<string> {
		const hasRoleHierarchy = this.hasRoleHierarchy(guild, role);
		if (!hasRoleHierarchy) {
			return Promise.reject(hierarchyError);
		}

		if (!temp) {
			const stopError = this.stopModeration('role persist', message, member, guildConfig, 'manageRoles');
			if (stopError) {
				return Promise.reject(stopError);
			}
		}

		try {
			const moderations = await this.getModerations(guild, member, 'role', { role: role.id });
			if (moderations.find((m: any) => m.role === role.id) && !add) {
				await member.removeRole(role.id, encodeURIComponent(`Responsible User: ${this.utils.fullName(message.author)}`));

				this.log({
					type: 'Remove Persist',
					user: member,
					guild: guild,
					mod: message.author,
					role, reason, guildConfig,
				});

				this.deleteCommand(message, guildConfig);
				this.removeModeration(guild, member, 'role', { role: role.id });
				return Promise.resolve(`Removed ${this.utils.fullName(member)} from ${role.name}`);
			}

			if (remove) {
				return Promise.resolve('No role persist found to remove');
			}
		} catch (err) {
			this.logger.error(err);
			return Promise.reject(`I wasn't able to remove that role.`);
		}

		if (limit) {
			if (isNaN(limit)) {
				return Promise.reject('Please use a valid limit less than 7 days. ex. 3m, 2h, 1d');
			}
			this.createModeration(message, member, message.author, 'role', limit, role);
		} else {
			this.createModeration(message, member, message.author, 'role', null, role);
		}

		this.log({
			type: 'Role Persist',
			user: member,
			guild: guild,
			mod: message.author,
			limit: limit,
			role: role,
			reason: reason,
			guildConfig: guildConfig,
		});

		if (!member.roles.includes(role.id)) {
			try {
				await member.addRole(role.id, encodeURIComponent(`Responsible User: ${this.utils.fullName(message.author)}`));
			} catch {
				return Promise.reject(`I was unable to add that role.`);
			}
		}

		this.deleteCommand(message, guildConfig);
		return Promise.resolve(this.getResponse(`Added ${role.name} to ${this.utils.fullName(member)}`, guildConfig, reason));
	}

	public async lockChannel(
		channel: eris.AnyGuildChannel,
		user: UserOrMember,
		guildConfig: dyno.GuildConfig,
		limit?: number,
		msg?: string,
	): Promise<any> {
		const guild = channel.guild;
		const Permissions = eris.Constants.Permissions;

		const overwrite: eris.PermissionOverwrite = channel.permissionOverwrites.get(guild.id) ||
			new eris.PermissionOverwrite({ allow: 0, deny: 0 });

		let denyInt = overwrite.deny || 0;

		if (overwrite.json.hasOwnProperty('sendMessages') && overwrite.json.sendMessages === false) {
			return Promise.reject('That channel is already locked.');
		}

		if (msg) {
			await this.sendMessage(channel, msg);
		}

		if (limit) {
			this.createChannelModeration(channel, user, limit, 'lock');
		}

		denyInt |= Permissions.sendMessages;

		try {
			await channel.editPermission(guild.id, overwrite.allow, denyInt, 'role',
				encodeURIComponent(`Responsible User: ${user.name || user.username}#${user.discrim || user.discriminator}`));
			return Promise.resolve(`Locked channel ${channel.mention}`);
		} catch (err) {
			return Promise.reject(`Unable to lock channel ${channel.mention}`);
		}
	}

	public async unlockChannel(
		channel: eris.AnyGuildChannel,
		user: UserOrMember,
		guildConfig: dyno.GuildConfig,
		msg?: string,
	): Promise<any> {
		const guild = channel.guild;
		const Permissions = eris.Constants.Permissions;

		const overwrite: eris.PermissionOverwrite = channel.permissionOverwrites.get(guild.id) ||
			new eris.PermissionOverwrite({ allow: 0, deny: 0 });

		let denyInt = overwrite.deny || 0;

		if (!overwrite.json.hasOwnProperty('sendMessages') || overwrite.json.sendMessages === true) {
			return Promise.reject('That channel is already unlocked.');
		}

		if (msg) {
			await this.sendMessage(channel, msg);
		}

		denyInt ^= Permissions.sendMessages;

		try {
			await channel.editPermission(guild.id, overwrite.allow, denyInt, 'role',
				encodeURIComponent(`Responsible User: ${user.name || user.username}#${user.discrim || user.discriminator}`));
			return Promise.resolve(`Unlocked channel ${channel.mention}`);
		} catch (err) {
			return Promise.reject(`Unable to unlock channel ${channel.mention}`);
		}
	}

	public createChannelModeration(
		channel: eris.GuildChannel,
		mod: eris.User,
		limit: number,
		type: string,
	) {
		const doc: ModerationDoc = {
			server : channel.guild.id,
			channel: channel.id,
			userid : mod.id,
			user   : { id: mod.id, name: mod.username, discrim: mod.discriminator },
			mod    : mod.id,
			type   : type,
		};

		if (limit) {
			doc.completedAt = moment().add(limit, 'minutes').startOf('minute');
		}

		const moderation = new this.models.Moderation(doc);
		moderation.save((err: any) => {
			if (err) {
				return this.logger.error(err, {
					type: 'moderation.create.save',
					guild: channel.guild.id,
					shard: channel.guild.shard.id,
				});
			}

			return this.logger.info(`Created moderation: ${type}, limit: ${limit}, completed at ${doc.completedAt}`);
		});
	}

	/**
	 * DM the user if they are kicked/banned
	 */
	public dmUser(
		guildConfig: dyno.GuildConfig,
		user: eris.User|eris.Member,
		text: string,
		reason: string,
		caseNum: number,
		type: string,
		limit?: number,
	) {
		text = limit ? `${text} for ${limit} minutes` : text;
		text = reason ? `${text} | ${reason}` : text;

		if (guildConfig.moderation && guildConfig.moderation.appealEnabled && ['mute', 'ban'].includes(type)) {
			const key = this.utils.sha256(`${this.globalConfig.hashSecret}.${user.id}`);
			text += `\n\nYou can view or appeal this at: ${this.config.site.host}/moderation/${guildConfig._id}/${caseNum}?key=${key}`;
		}

		return this.client.getDMChannel(user.id).then((channel: eris.PrivateChannel) => {
			if (!channel) {
				this.logger.error(`Channel is undefined or null ${this.client.privateChannelMap[user.id]}`);
				return;
			}
			this.sendMessage(channel, text);
		}).catch((err: any) => this.logger.error(err));
	}

	/**
	 * Delete the command if enabled
	 */
	public deleteCommand(message: eris.Message, guildConfig: dyno.GuildConfig) {
		if (guildConfig.moderation && guildConfig.moderation.deleteCommands) {
			this.client.deleteMessage(message.channel.id, message.id).catch(() => null);
		}
	}

	/**
	 * Check if a member is protected
	 */
	public isProtected(message: eris.Message, member: eris.Member, guildConfig: dyno.GuildConfig) {
		if (!guildConfig.moderation || !guildConfig.moderation.protectedRoles) {
			return false;
		}

		if (!member.roles || !member.roles.length) {
			return false;
		}

		const protectedRoles = member.roles.find((r: string) => guildConfig.moderation.protectedRoles.find((p: any) => p.id === r));
		if (protectedRoles != undefined) {
			return true;
		}

		return false;
	}

	public stopModeration(action: string, message: eris.Message, member: UserOrMember, guildConfig: any, ...perms: string[]): string {
		if (!['mute', 'unmute', 'role persist'].includes(action)) {
			if (member.id === this.client.user.id || member.id === message.author.id) {
				return `I can't ${action} that user.`;
			}
		}

		if (!['role persist'].includes(action) && this.isServerMod(member, message.channel)) {
			return modError;
		}

		if (!['role persist'].includes(action) && this.isProtected(message, member, guildConfig)) {
			return protectedError;
		}

		if (perms) {
			const missingPermissions = this.missingPermissions((<eris.GuildChannel>message.channel).guild, ...perms);
			if (missingPermissions) {
				return `I'm missing the following permissions: ${missingPermissions.map((perm: string) => this.config.permissionsMap[perm])}`;
			}
		}
	}

	public getResponse(response: string, guildConfig: dyno.GuildConfig, reason: string): string {
		if (reason && reason.length) {
			if (guildConfig.moderation && guildConfig.moderation.respondWithReasons) {
				response += `, ${reason}`;
			}
		}
		return `***${response}***`;
	}

	public getCustomResponse(user: string, key: string, guildConfig: dyno.GuildConfig, reason: string): string {
		const defaultMessages = {
			banMessage: '***{user} was banned***',
			unbanMessage: '***{user} was unbanned***',
			softbanMessage: '***{user} was softbanned***',
			kickMessage: '***{user} was kicked***',
			muteMessage: '***{user} was muted***',
			unmuteMessage: '***{user} was unmuted***',
		};

		let response = defaultMessages[key];

		if (guildConfig.isPremium) {
			response = guildConfig.moderation && guildConfig.moderation[key] || defaultMessages[key];
		}
		response = response.replace(/{user}/g, user);

		if (reason && reason.length) {
			if (guildConfig.moderation && guildConfig.moderation.respondWithReasons) {
				response += ` | ${reason}`;
			}
		}
		return `${response}`;
	}
}

'use strict';

const moment = require('moment');
const Base = Loader.require('./core/structures/Base');
const Role = Loader.require('./core/structures/Role');
const utils = Loader.require('./core/utils');
const models = require('../../core/models');

class Moderation extends Base {
	/**
	 * Create muted role
	 * @param {Guild} guild Guild object
	 * @return {Promise}
	 */
	async createMutedRole(guild, guildConfig, _role) {
		const options = { name: 'Muted', color: utils.hexToInt('#818386') };

		_role = _role || new Role(guild, guildConfig);

		try {
			var role = await _role.getOrCreate(options);
		} catch (e) {
			return Promise.resolve();
		}

		if (!role) return;

		// set muted role id
		guildConfig.moderation = guildConfig.moderation || {};
		guildConfig.moderation.mutedRole = role.id;

		this.dyno.guilds.update(guild.id, { $set: { 'moderation.mutedRole': role.id } })
			.then(() => this.info(`Server: ${guild.id}, Created Muted role for server ${guild.name}.`))
			.catch(err => this.logger.error(err, {
				type: 'moderation.createMutedRole.guilds.update',
				guild: guild.id,
				shard: guild.shard.id,
			}));

		// Verify overwrite permissions are enabled for each channel
		_role.createOverwritePermissions([...guild.channels.values()], [
			'sendMessages',
			'addReactions',
			'voiceSpeak',
		]);

		return Promise.resolve(role);
	}

	/**
	 * Create a timed moderation
	 * @param {Message} msg Message object
	 * @param {User|Member} user User object
	 * @param {String} type Type of moderation
	 * @param {Number} limit Limit in minutes
	 * @returns {*}
	 */
	createModeration(msg, user, mod, type, limit, role) {
		const doc = {
			server:      msg.channel.guild.id,
			channel:     msg.channel.id,
			userid:      user.id,
			user:        { id: user.id, name: user.name, discrim: user.discriminator },
			mod:         mod.id,
			type:        type,
		};

		if (role) {
			doc.role = role.id;
		}

		if (limit) {
			doc.completedAt = moment().add(limit, 'minutes').startOf('minute');
		}

		const moderation = new models.Moderation(doc);
		moderation.save(err => {
			if (err) return this.logger.error(err, {
				type: 'moderation.create.save',
				guild: msg.channel.guild.id,
				shard: msg.channel.guild.shard.id,
			});
			return this.logger.info(`Created moderation: ${type}, limit: ${limit}, completed at ${doc.completedAt}`);
		});
	}

	/**
	 * Remove a moderation
	 * @param {Message} msg Message object
	 * @param {User|Member} user User object
	 */
	removeModeration(guild, user) {
		models.Moderation.remove({ server: guild.id, userid: user.id, createdAt: { $exists: true } }).catch(() => false);
	}

	/**
	 * Log moderation event
	 * @param {String} event Event type
	 * @param {User|Member} user User object
	 * @param {Guild} guild Server object
	 * @param {User|Member} [mod] Moderator user object
	 * @param {Number} [limit] Time limit
	 * @param {String} [reason] Reason for moderation (optional)
	 * @returns {void}
	 */
	async log(event) {
		const { type, user, guild, mod, limit, role, reason, guildConfig } = event;

		guildConfig.moderation = guildConfig.moderation || {};
		guildConfig.moderation.count = (guildConfig.moderation.count || 0) + 1;

		this.dyno.guilds.update(guild.id, { $set: { 'moderation.count': guildConfig.moderation.count } })
			.catch(err => this.logger.error(err, {
				type: 'moderation.log.guilds.update',
				guild: guild.id,
				shard: guild.shard.id,
			}));

		const colorMap = [
			['ban', utils.getColor('red')],
			['softban', utils.getColor('red')],
			['mute', utils.getColor('orange')],
			['kick', utils.getColor('orange')],
			['warn', utils.getColor('yellow')],
			['unban', utils.getColor('yellow')],
			['unmute', utils.getColor('green')],
			['clearwarn', utils.getColor('green')],
			['role', utils.getColor('yellow')],
		];

		const caseNum = guildConfig.moderation.count;
		const userString = typeof user === 'string' ? user : utils.fullName(user);
		const avatarURL = user.avatarURL || (user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.jpg` : null);

		if (!guildConfig.moderation.channel) return;

		const channel = this.client.getChannel(guildConfig.moderation.channel);
		if (!channel) return;

		let modtype = type.split(' ').shift().toLowerCase();

		let color = colorMap.find(c => modtype.startsWith(c[0]));
		color = color ? color[1] : utils.getColor('orange');

		const embed = {
			color: color,
			author: { name: `Case ${caseNum} | ${type} | ${userString}`, icon_url: avatarURL },
			fields: [
				{ name: 'User', value: `${user.mention || utils.fullName(user)}`, inline: true },
				{ name: 'Moderator', value: mod ? mod.mention : `<@${this.dyno.userid}>`, inline: true },
			],
			footer: { text: `ID: ${user.id}` },
			timestamp: new Date(),
		};

		if (limit) embed.fields.push({ name: 'Length', value: `${limit} minutes`, inline: true });
		if (role) embed.fields.push({ name: 'Role', value: `${role.name}`, inline: true });
		if (reason) embed.fields.push({ name: 'Reason', value: reason, inline: true });

		const msg = await this.sendMessage(channel, { embed });

		let doc = {
			caseNum: caseNum,
			server: guild.id,
			type: type,
			reason: reason || 'None',
			message: msg ? msg.id || null : null,
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

		const log = new models.ModLog(doc);
		log.save(err => err ? this.logger.error(err, {
			type: 'moderation.log.save',
			guild: guild.id,
			shard: guild.shard.id,
		}) : false);
	}

	// async ban(guild, user, mod, limit, reason = 'No reason given.') {
	// }
}

module.exports = Moderation;

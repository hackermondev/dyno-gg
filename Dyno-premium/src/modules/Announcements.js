'use strict';

const Module = Loader.require('./core/structures/Module');
const utils = Loader.require('./core/utils');

/**
 * Announcements Module
 * @class Announcements
 * @extends Module
 */
class Announcements extends Module {
	constructor() {
		super();

		this.module = 'Announcements';
		this.description = 'Enables join/leave/ban announcements (with options).';
		this.enabled = true;
		this.hasPartial = true;
	}

	static get name() {
		return 'Announcements';
	}

	get settings() {
		return {
			channel:      String,
			joinEnabled:  Boolean,
			leaveEnabled: Boolean,
			banEnabled:   Boolean,
			dmJoins:      Boolean,
			joinMessage:  String,
			leaveMessage: String,
			banMessage:   String,
		};
	}

	start() {
		this.defaults = this.config.announcements;
		this.bans = [];

		this.schedule('*/1 * * * *', this.clearBans.bind(this));
	}

	diagnose({ guildConfig, diagnosis, remote }) {
		if (!guildConfig.announcements) return diagnosis;

		const type = (guildConfig.announcements.joinEnabled ||
			guildConfig.announcements.leaveEnabled ||
			guildConfig.announcements.banEnabled) ? 'info' : 'issues';

		diagnosis[type].push(`Join announcements are ${guildConfig.announcements.joinEnabled ? 'enabled' : 'disabled'}`);
		diagnosis[type].push(`Leave announcements are ${guildConfig.announcements.leaveEnabled ? 'enabled' : 'disabled'}`);
		diagnosis[type].push(`Ban announcements are ${guildConfig.announcements.banEnabled ? 'enabled' : 'disabled'}`);

		if (guildConfig.announcements.dmJoins) {
			diagnosis.info.push(`Join announcements will be sent in DM to new members`);
		}

		if (guildConfig.announcements.channel && guildConfig.announcements.channel !== 'Select Channel') {
			const channel = this.client.getChannel(guildConfig.announcements.channel);
			if (!channel && !remote) {
				diagnosis.issues.push(`I can't find the announcement channel. It is hidden from me or deleted.`);
			} else {
				diagnosis.info.push(`The announcement channel is ${channel.mention}.`);
			}
		}

		return diagnosis;
	}

	clearBans() {
		this.bans = [];
	}

	/**
	 * onJoin event handler
	 * @param {Guild} guild Guild object
	 * @param {Member} member User object
	 * @returns {Promise}
	 */
	guildMemberAdd({ guild, member, guildConfig }) {
		if (!guildConfig || !guildConfig.announcements) return;
		if (!this.isEnabled(guild, this.module, guildConfig)) return;

		let { joinEnabled, joinMessage, channel, dmJoins } = guildConfig.announcements;

		if (!joinEnabled || !member || member.bot) {
			return;
		}

		channel = guild.channels.find(c => c.id === channel) || guild.defaultChannel;

		if (!joinMessage || !joinMessage.length) joinMessage = this.defaults.joinMessage;

		const data = { guild: guild, channel: channel, user: member };
		const message = utils.replacer(joinMessage, data);

		if (!dmJoins) return this.sendMessage(channel, message);

		return this.client.getDMChannel(member.id)
			.then(channel => this.sendMessage(channel, message).catch(err => this.logger.error(err)))
			.catch(err => this.logger.error(err, {
				type: 'announcements.guildMemberAdd.getDMChannel',
				guild: guild.id,
				shard: guild.shard.id,
			}));
	}

	/**
	 * onLeave event handler
	 * @param {Guild} guild Guild object
	 * @param {Member} member User object
	 * @returns {*}
	 */
	guildMemberRemove({ guild, member, guildConfig }) {
		if (!guildConfig || !guildConfig.announcements) return;
		if (!this.isEnabled(guild, this.module, guildConfig)) return;

		let { leaveEnabled, leaveMessage, channel } = guildConfig.announcements;

		if (!leaveEnabled || !member || member.bot) {
			return;
		}

		const index = this.bans.indexOf(`${guild.id}${member.id}`);
		if (index > -1) {
			this.bans.splice(index, 1);
			return;
		}

		channel = guild.channels.find(c => c.id === channel) || guild.defaultChannel;

		if (!leaveMessage || !leaveMessage.length) leaveMessage = this.defaults.leaveMessage;

		const data = { guild: guild, channel: channel, user: member };
		const message = utils.replacer(leaveMessage, data, false);

		return this.sendMessage(channel, message);
	}

	/**
	 * onBan event handler
	 * @param {Guild} guild Guild object
	 * @param {Member} member User object
	 * @returns {*}
	 */
	guildBanAdd({ guild, member, guildConfig }) {
		if (!guildConfig || !guildConfig.announcements) return;
		if (!this.isEnabled(guild, this.module, guildConfig)) return;

		let { banEnabled, banMessage, channel } = guildConfig.announcements;

		if (!banEnabled || !member || member.bot) {
			return;
		}

		channel = guild.channels.find(c => c.id === channel) || guild.defaultChannel;

		if (!banMessage || !banMessage.length) banMessage = this.defaults.banMessage;

		const data = { guild: guild, channel: channel, user: member };
		const message = utils.replacer(banMessage, data, false);

		this.bans.push(`${guild.id}${member.id}`);

		return this.sendMessage(channel, message);
	}
}

module.exports = Announcements;

import { Module } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as dyno from 'Dyno';

/**
 * Announcements Module
 * @class Announcements
 * @extends Module
 */
export default class Announcements extends Module {
	public module     : string  = 'Announcements';
	public description: string  = 'Enables join/leave/ban announcements (with options).';
	public list       : boolean = true;
	public enabled    : boolean = true;
	public hasPartial : boolean = true;

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

	public start() {
		this.defaults = this.dyno.globalConfig.announcements;
		this.bans = [];

		this.schedule('*/1 * * * *', this.clearBans.bind(this));
	}

	public diagnose({ guildConfig, diagnosis, remote }: any) {
		if (!guildConfig.announcements) {
			return diagnosis;
		}

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

	public clearBans() {
		this.bans = [];
	}

	/**
	 * onJoin event handler
	 * @param {Guild} guild Guild object
	 * @param {Member} member User object
	 * @returns {Promise}
	 */
	public guildMemberAdd({ guild, member, guildConfig }: any) {
		if (!guildConfig || !guildConfig.announcements || !member.id) { return; }
		if (!this.isEnabled(guild, this.module, guildConfig)) { return; }

		const { dmJoins, joinEnabled } = guildConfig.announcements;
		let { joinMessage, channel } = guildConfig.announcements;

		if (!joinEnabled || !member || member.bot) {
			return;
		}

		channel = guild.channels.find((c: eris.GuildChannel) => c.id === channel) || guild.defaultChannel;
		if (!channel) { return; }

		if (!joinMessage || !joinMessage.length) {
			joinMessage = this.defaults.joinMessage;
		}

		const data = { guild: guild, channel: channel, user: member };
		const message = this.utils.replacer(joinMessage, data);

		if (!dmJoins) {
			return this.sendMessage(channel, message)
				.then(() => this.statsd.increment('announcements.join', 1))
				.catch(() => this.statsd.increment('announcements.error', 1));
		}

		return this.client.getDMChannel(member.id)
			.then((dmChannel: eris.PrivateChannel) =>
				this.sendMessage(dmChannel, message)
					.then(() => this.increment('announcements.dm', 1))
					.catch(() => this.statsd.increment('announcements.error', 1)))
			.catch((err: string) => {
				this.statsd.increment('announcements.error', 1);
				this.logger.error(err, {
					type: 'announcements.guildMemberAdd.getDMChannel',
					guild: guild.id,
					shard: guild.shard.id,
				});
			});
	}

	/**
	 * onLeave event handler
	 * @param {Guild} guild Guild object
	 * @param {Member} member User object
	 * @returns {*}
	 */
	public guildMemberRemove({ guild, member, guildConfig }: any) {
		if (!guildConfig || !guildConfig.announcements || !member.id) { return; }
		if (!this.isEnabled(guild, this.module, guildConfig)) { return; }

		const { leaveEnabled } = guildConfig.announcements;
		let { leaveMessage, channel } = guildConfig.announcements;

		if (!leaveEnabled || !member || member.bot) {
			return;
		}

		const index = this.bans.indexOf(`${guild.id}${member.id}`);
		if (index > -1) {
			this.bans.splice(index, 1);
			return;
		}

		channel = guild.channels.find((c: eris.GuildChannel) => c.id === channel) || guild.defaultChannel;
		if (!channel) { return; }

		if (!leaveMessage || !leaveMessage.length) {
			leaveMessage = this.defaults.leaveMessage;
		}

		const data = { guild: guild, channel: channel, user: member };
		const message = this.utils.replacer(leaveMessage, data, false);

		return this.sendMessage(channel, message)
			.then(() => this.statsd.increment('announcements.leave', 1))
			.catch(() => this.statsd.increment('announcements.error', 1));
	}

	/**
	 * onBan event handler
	 * @param {Guild} guild Guild object
	 * @param {Member} member User object
	 * @returns {*}
	 */
	public guildBanAdd({ guild, member, guildConfig }: any) {
		if (!guildConfig || !guildConfig.announcements || !member.id) { return; }
		if (!this.isEnabled(guild, this.module, guildConfig)) { return; }

		const { banEnabled } = guildConfig.announcements;
		let { banMessage, channel } = guildConfig.announcements;

		if (!banEnabled || !member || member.bot) {
			return;
		}

		channel = guild.channels.find((c: eris.GuildChannel) => c.id === channel) || guild.defaultChannel;
		if (!channel) { return; }

		if (!banMessage || !banMessage.length) {
			banMessage = this.defaults.banMessage;
		}

		const data = { guild: guild, channel: channel, user: member };
		const message = this.utils.replacer(banMessage, data, false);

		this.bans.push(`${guild.id}${member.id}`);

		return this.sendMessage(channel, message)
			.then(() => this.statsd.increment('announcements.ban', 1))
			.catch(() => this.statsd.increment('announcements.error', 1));
	}
}

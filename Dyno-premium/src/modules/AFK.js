'use strict';

const moment = require('moment');
const Module = Loader.require('./core/structures/Module');

/**
 * AFK Module
 * @class AFK
 * @extends Module
 */
class AFK extends Module {
	constructor() {
		super();

		this.module = 'AFK';
		this.description = 'Allow members to set an AFK status.';
		this.enabled = true;
		this.hasPartial = false;

		this.permissions = ['manageNicknames'];
	}

	static get name() {
		return 'AFK';
	}

	get settings() {
		return {
			users: { type: Object, default: {} },
			ignoredChannels: { type: Array },
		};
	}

	/**
	 * Message create event handler
	 * @param  {Object} options.message Message object
	 * @return {void}
	 */
	messageCreate({ message, guildConfig }) {
		if (!message.channel.guild || !message.member || message.author.bot) return;
		if (!this.isEnabled(message.channel.guild, this, guildConfig)) return;

		// const guildConfig = await this.dyno.guilds.getOrFetch(message.channel.guild.id);
		if (!guildConfig || !guildConfig.afk || !guildConfig.afk.users) return;

		if (guildConfig.afk && guildConfig.afk.ignoredChannels) {
			if (guildConfig.afk.ignoredChannels.includes(message.channel.id)) return;
		}

		if (guildConfig.afk.users[message.author.id]) {
			let afkUser = guildConfig.afk.users[message.author.id];

			if (Date.now() - parseInt(afkUser.time) < 30000) return;

			if (message.member.nick && message.member.nick.includes('[AFK]')) {
				const name = message.member.nick.replace(/\[AFK\]\s/g, '');
				message.member.edit({ nick: name }).catch(() => false);
			}

			this.sendMessage(message.channel,
				`Welcome back ${message.author.mention}, I removed your AFK`,
				{ deleteAfter: 9000 }
			);
			delete guildConfig.afk.users[message.author.id];
			this.dyno.guilds.update(message.channel.guild.id, { $set: { 'afk.users': guildConfig.afk.users } })
				.catch(err => this.logger.error(err));
			return;
		}

		if (message.mentions) {
			for (let user of message.mentions) {
				if (guildConfig.afk.users[user.id]) {
					let afkUser = guildConfig.afk.users[user.id];
					this.sendMessage(message.channel, `${afkUser.name} is AFK: ${afkUser.message} - ${moment(afkUser.time).fromNow()}`);
				}
			}
		}
	}

	/**
	 * Set AFK for a user
	 * @param {Object} msg Message object
	 * @param {String} status Optional status message
	 */
	async setAFK(msg, status) {
		if (!await this.isEnabled(msg.channel.guild, this)) return;

		const guildConfig = await this.dyno.guilds.getOrFetch(msg.channel.guild.id);
		if (!guildConfig) return Promise.reject(`An error occurred.`);

		guildConfig.afk = guildConfig.afk || {};
		guildConfig.afk.users = guildConfig.afk.users || {};

		if (guildConfig.afk.users[msg.author.id]) {
			return Promise.reject();
		}

		const name = msg.member.nick || msg.author.username;

		guildConfig.afk.users[msg.member.id] = {
			name: name,
			message: status,
			time: Date.now(),
		};

		this.dyno.guilds.update(msg.channel.guild.id, { $set: { 'afk.users': guildConfig.afk.users } })
			.catch(err => this.logger.error(err));

		await msg.member.edit({ nick: `[AFK] ${name}` }).catch(() => false);

		return Promise.resolve(`${msg.author.mention} I set your AFK: ${status}`, { deleteAfter: 9000 });
	}

	/**
	 * Add AFK ignored channels to not return when talking
	 * @param {Object} message Message object
	 * @param {Object} guildConfig Guild configuration
	 * @return {Promise}
	 */
	ignoreChannel(message, guildConfig) {
		if (!guildConfig) return Promise.reject('No server config found.');

		guildConfig.afk = guildConfig.afk || {};
		guildConfig.afk.ignoredChannels = guildConfig.afk.ignoredChannels || [];

		if (guildConfig.afk.ignoredChannels.includes(message.channel.id)) {
			return Promise.reject('This channel is already ignored.');
		}

		guildConfig.afk.ignoredChannels.push(message.channel.id);

		return new Promise((resolve, reject) =>
			this.dyno.guilds.update(message.channel.guild.id, { $set: { 'afk.ignoredChannels': guildConfig.afk.ignoredChannels } })
				.then(() => resolve(`Added ${message.channel.mention} to AFK ignored channels.`))
				.catch(() => reject('Something went wrong.')));
	}
}

module.exports = AFK;

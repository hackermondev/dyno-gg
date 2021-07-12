'use strict';

const Clever = require('cleverbot-node');
const Module = Loader.require('./core/structures/Module');

class Cleverbot extends Module {
	constructor() {
		super();

		this.module = 'Cleverbot';
		this.description = 'This module is globally disabled';
		this.enabled = true;
		this.hasPartial = true;
		this.vipOnly = true;
	}

	static get name() {
		return 'Cleverbot';
	}

	get settings() {
		return {
			ignoredChannels: { type: Array, default: [] },
			allowedChannels: { type: Array, default: [] },
		};
	}

	start() {
		this._clever = new Clever();
		this._cooldowns = new Map();

		this._clever.configure({ botapi: this.config.cleverbot.key });

		this.schedule('*/1 * * * *', this.clearCooldowns.bind(this));
	}

	clearCooldowns() {
		for (let [id, time] of this._cooldowns) {
			if ((Date.now() - time) < 3000) continue;
			this._cooldowns.delete(id);
		}
	}

	messageCreate({ message, guildConfig }) {
		if (this.config.test) return;
		if (!message.author || (message.author && message.author.bot)) return;

		if (!message.content.startsWith(`<@${this.client.user.id}>`) &&
			!message.content.startsWith(`<@!${this.client.user.id}>`)) return;

		if (!guildConfig || !guildConfig.isPremium) return;
		if (!this.isEnabled(message.channel.guild, this.module, guildConfig)) return;

		let channelCooldown = this._cooldowns.get(message.channel.id);
		if (channelCooldown && (Date.now() - channelCooldown) < 3000) return;
		this._cooldowns.set(message.channel.id, Date.now());

		let cooldown = this._cooldowns.get(message.author.id);
		if (cooldown && (Date.now() - cooldown) < 3000) return;
		this._cooldowns.set(message.author.id, Date.now());

		if (guildConfig.cleverbot && guildConfig.cleverbot.ignoredChannels) {
			if (guildConfig.cleverbot.ignoredChannels.find(c => c.id === message.channel.id)) return;
		}

		let cmd = message.content,
			prefixes = [
				`<@${this.client.user.id}> `,
				`<@!${this.client.user.id}> `,
			];

		for (let pref of prefixes) {
			cmd = cmd.replace(pref, '');
		}

		cmd = cmd.split(' ')[0].toLowerCase();
		if (!cmd.length) return;

		const commands = this.dyno.commands;
		if (commands.has(cmd)) return;

		setTimeout(() => {
			this._clever.write(message.content.replace(/<@!?([0-9]+)>/g, ''), response => {
				this.sendMessage(message.channel, response.output);
			});
		}, 800);
	}
}

module.exports = Cleverbot;

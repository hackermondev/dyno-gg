import {Module} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as each from 'async-each';
import * as Clever from 'cleverbot-node';
import * as dyno from 'Dyno';

export default class Cleverbot extends Module {
	public module     : string  = 'Cleverbot';
	public description: string  = 'This module is globally disabled';
	public list       : boolean = true;
	public enabled    : boolean = true;
	public hasPartial : boolean = true;
	public vipOnly    : boolean = true;

	get settings() {
		return {
			ignoredChannels: { type: Array, default: [] },
			allowedChannels: { type: Array, default: [] },
		};
	}

	public start() {
		this._clever = new Clever();
		this._cooldowns = new Map();

		this._clever.configure({ botapi: this.config.cleverbot.key });

		this.schedule('*/3 * * * *', this.clearCooldowns.bind(this));
	}

	public messageCreate({ message, guildConfig }: any) {
		if (this.config.test ||
			!message.author ||
			(message.author && message.author.bot) ||
			!guildConfig.isPremium) { return; }

		if (!message.content.startsWith(`<@${this.client.user.id}>`) &&
			!message.content.startsWith(`<@!${this.client.user.id}>`)) { return; }

		if (!this.isEnabled(message.channel.guild, this.module, guildConfig)) { return; }

		const channelCooldown = this._cooldowns.get(message.channel.id);
		if (channelCooldown && (Date.now() - channelCooldown) < 3000) { return; }
		this._cooldowns.set(message.channel.id, Date.now());

		const cooldown = this._cooldowns.get(message.author.id);
		if (cooldown && (Date.now() - cooldown) < 3000) { return; }
		this._cooldowns.set(message.author.id, Date.now());

		if (guildConfig.cleverbot && guildConfig.cleverbot.ignoredChannels) {
			if (guildConfig.cleverbot.ignoredChannels.find((c: any) => c.id === message.channel.id)) {
				return;
			}
		}

		let cmd = message.content;
		const prefixes = [
			`<@${this.client.user.id}> `,
			`<@!${this.client.user.id}> `,
		];

		for (const pref of prefixes) {
			cmd = cmd.replace(pref, '');
		}

		cmd = cmd.split(' ')[0].toLowerCase();
		if (!cmd.length) { return; }

		const commands = this.dyno.commands;
		if (commands.has(cmd)) { return; }

		setTimeout(() => {
			this._clever.write(message.content.replace(/<@!?([0-9]+)>/g, ''), (response: any) => {
				this.sendMessage(message.channel, response.output);
			});
		}, 800);
	}

	private clearCooldowns() {
		each([...this._cooldowns.keys()], (id: string) => {
			const time = this._cooldowns.get(id);
			if ((Date.now() - time) < 3000) { return; }
			this._cooldowns.delete(id);
		});
	}
}

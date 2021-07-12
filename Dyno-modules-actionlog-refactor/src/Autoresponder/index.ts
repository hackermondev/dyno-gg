import {Module} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as each from 'async-each';
import * as dyno from 'Dyno';

/**
 * Autoresponder Module
 * @class Autoresponder
 * @extends Module
 */
export default class Autoresponder extends Module {
	public module     : string  = 'Autoresponder';
	public description: string  = 'Automatically respond to text triggers.';
	public list       : boolean = true;
	public enabled    : boolean = true;
	public hasPartial : boolean = true;

	get settings() {
		return {
			commands: { type: Array, default: [] },
		};
	}

	public start() {
		this._cooldowns = new Map();
		this.schedule('*/1 * * * *', this.clearCooldowns.bind(this));
	}

	/**
	 * Message create event handler
	 */
	public messageCreate({ message, guildConfig }: any) {
		if (!message.member ||
			message.author.bot ||
			!message.channel.guild ||
			!guildConfig.autoresponder ||
			!guildConfig.autoresponder.commands) { return; }

		if (!this.isEnabled(message.channel.guild, this.module, guildConfig)) { return; }

		const cooldown = this._cooldowns.get(message.author.id);
		if (cooldown && (Date.now() - cooldown) < 2000) { return; }

		this._cooldowns.set(message.author.id, Date.now());

		const commands = guildConfig.autoresponder.commands;
		const content  = message.content.toLowerCase();
		const result   = commands.find((c: any) => {
			const text = `^${this.utils.regEscape(c.command).replace(/\\?{\\?\*\\?}/g, '.*')}$`;
			return content.match(new RegExp(text, 'i'));
		});

		if (!content.length || !result) { return; }

		const data = { guild: message.channel.guild, channel: message.channel, user: message.member };
		const response = this.utils.replacer(result.response, data);

		this.sendMessage(message.channel, response);
	}

	private clearCooldowns() {
		each([...this._cooldowns.keys()], (id: string) => {
			const time = this._cooldowns.get(id);
			if ((Date.now() - time) < 2000) { return; }
			this._cooldowns.delete(id);
		});
	}
}

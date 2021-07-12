'use strict';

const Module = Loader.require('./core/structures/Module');
const utils = Loader.require('./core/utils');

/**
 * Autoresponder Module
 * @class Autoresponder
 * @extends Module
 */
class Autoresponder extends Module {
	constructor(...args) {
		super(...args);

		this.module = 'Autoresponder';
		this.description = 'Automatically respond to text triggers.';
		this.enabled = true;
		this.hasPartial = true;
	}

	static get name() {
		return 'Autoresponder';
	}

	get settings() {
		return {
			commands: { type: Array, default: [] },
		};
	}

	start() {
		this._cooldowns = new Map();
		this.schedule('*/1 * * * *', this.clearCooldowns.bind(this));
	}

	clearCooldowns() {
		for (let [id, time] of this._cooldowns) {
			if ((Date.now() - time) < 2000) continue;
			this._cooldowns.delete(id);
		}
	}

	/**
	 * Message create event handler
	 * @param  {Message} message Message object
	 * @return {void}
	 */
	messageCreate({ message, guildConfig }) {
		if (!message.member || message.author.bot || !message.channel.guild) return;

		// const guildConfig = await this.dyno.guilds.getOrFetch(message.channel.guild.id);
		if (!guildConfig || !guildConfig.autoresponder || !guildConfig.autoresponder.commands) return;

		if (!this.isEnabled(message.channel.guild, this.module, guildConfig)) return

		const cooldown = this._cooldowns.get(message.author.id);
		if (cooldown && (Date.now() - cooldown) < 2000) return;

		this._cooldowns.set(message.author.id, Date.now());

		const commands = guildConfig.autoresponder.commands,
			content  = message.content.toLowerCase(),
			result   = commands.find(c => c.command.toLowerCase() === content);

		if (!content.length || !result) return;

		const data = { guild: message.channel.guild, channel: message.channel, user: message.member },
			response = utils.replacer(result.response, data);

		this.sendMessage(message.channel, response);
	}
}

module.exports = Autoresponder;

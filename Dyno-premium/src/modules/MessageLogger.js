'use strict';

const Module = Loader.require('./core/structures/Module');
const { Message } = require('../core/models');

/**
 * Message logging module
 * @class MessageLogger
 * @extends Module
 */
class MessageLogger extends Module {
	constructor() {
		super();

		this.module = 'MessageLogger';
		this.friendlyName = 'Message Logger';
		this.description = 'Logs incoming messages to the database.';
		this.core = true;
		this.enabled = true;
		this.list = false;
	}

	static get name() {
		return 'MessageLogger';
	}

	/**
	 * Log messages to the db
	 * @param {Message} message Message object
	 */
	messageCreate({ message, guildConfig }) {
		const globalConfig = this.dyno.globalConfig;
		if (globalConfig && globalConfig.modules.hasOwnProperty(this.module) &&
			globalConfig.modules[this.module] === false) return;

		if (!this.isEnabled(message.channel.guild, this.dyno.modules.get('ActionLog'), guildConfig)) return;

		if (!message.author) return;

		Message.collection.insert({
			id: message.id,
			type: message.type,
			channelID: message.channel.id,
			content: message.content,
			cleanContent: message.cleanContent,
			timestamp: message.timestamp,
			author: Object.assign(message.author.toJSON(), { avatarURL: message.author.avatarURL }),
			createdAt: new Date(),
		});
	}
}

module.exports = MessageLogger;

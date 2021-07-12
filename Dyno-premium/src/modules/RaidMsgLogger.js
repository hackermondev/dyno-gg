'use strict';

const Module = Loader.require('./core/structures/Module');
const utils = Loader.require('./core/utils');

/**
 * Message logging module
 * @class RaidMsgLogger
 * @extends Module
 */
class RaidMsgLogger extends Module {
	constructor() {
		super();

		this.module = 'RaidMsgLogger';
		this.friendlyName = 'Raid Message Logger';
		this.description = 'Logs messages that match a certain pattern to a discord channel.';
		this.core = true;
		this.enabled = true;
		this.list = false;
	}

	static get name() {
		return 'RaidMsgLogger';
	}

	/**
	 * Log messages to the db
	 * @param {Message} message Message object
	 */
	messageCreate({ message }) {
		const globalConfig = this.dyno.globalConfig;
		if (globalConfig && globalConfig.modules.hasOwnProperty(this.module) &&
			globalConfig.modules[this.module] === false) return;

		if (!message.content.startsWith('>msg')) return;

		const embed = {
			color: 16729871,
			author: {
				name: utils.fullName(message.author, false),
				icon_url: message.author.avatarURL || null,
			},
			description: message.content,
			footer: { text: `ID: ${message.author.id}` },
			timestamp: new Date(),
		};

		this.client.createMessage('290131903460147210', { embed });
	}
}

module.exports = RaidMsgLogger;

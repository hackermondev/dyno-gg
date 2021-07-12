'use strict';

const { Module } = require('@dyno.gg/dyno-core');

/**
 * Coal Module
 * @class Coal
 * @extends Module
 */
class Coal extends Module {
	constructor(...args) {
		super(...args);

		this.module = 'Coal';
		this.description = 'Auto reacts to coal';
		this.enabled = true;
		this.list = true;
		this.hasPartial = false;
	}

	static get name() {
		return 'Coal';
	}

	messageCreate({ message, guildConfig }) {
		if (message.channel.guild.id !== this.config.dynoGuild) { return; }

		const users = [
			'155698776512790528', // Coal
		];

		if (!users.includes(message.author.id)) { return; }
		const emojis = ['🔪', 'banned:332321864540094464'];

		// this.client.banGuildMember(message.guild.id, '155698776512790528', 0, 'Bye Coal')
		// 	.catch(() => null);

		for (let emoji of emojis) {
			this.client.addMessageReaction(message.channel.id, message.id, emoji)
				.catch((err) => console.error(err));
		}
	}
}

module.exports = Coal;

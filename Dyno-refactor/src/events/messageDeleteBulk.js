'use strict';

const { utils } = require('@dyno.gg/dyno-core');

module.exports = function messageDeleteBulk(dispatcher, message) {
	if (!dispatcher.dyno.isReady || (message.author && message.author.bot)) return Promise.reject();
	if (!message.channel || !message.channel.guild) return Promise.reject();

	if (dispatcher.config.handleRegion && !utils.regionEnabled(message.channel.guild, dispatcher.config)) return Promise.reject();

	return new Promise((resolve, reject) => {
		dispatcher.dyno.guilds.getOrFetch(message.channel.guild.id).then(guildConfig => resolve({
				message: message,
				channel: message.channel,
				guild: message.channel.guild,
				guildConfig: guildConfig,
			})).catch(() => reject());
	});
};

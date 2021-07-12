'use strict';

const utils = require('../core/utils');

module.exports = function guildRoleCreate(dispatcher, guild, role) {
	if (!dispatcher.dyno.isReady || !guild || !role) return Promise.reject();

	if (dispatcher.config.handleRegion && !utils.regionEnabled(guild, dispatcher.config)) return Promise.reject();

	return new Promise((resolve, reject) => {
		dispatcher.dyno.guilds.getOrFetch(guild.id).then(guildConfig => resolve({
				guild: guild,
				role: role,
				guildConfig: guildConfig,
			})).catch(() => reject());
	});
};

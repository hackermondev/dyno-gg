'use strict';

const utils = require('../core/utils');

module.exports = function guildMemberUpdate(dispatcher, guild, member, oldMember) {
	if (!dispatcher.dyno.isReady || !guild || !member) return Promise.reject();

	if (dispatcher.config.handleRegion && !utils.regionEnabled(guild, dispatcher.config)) return Promise.reject();

	return new Promise((resolve, reject) => {
		dispatcher.dyno.guilds.getOrFetch(guild.id).then(guildConfig => resolve({
				guild: guild,
				member: member,
				oldMember: oldMember,
				guildConfig: guildConfig,
			})).catch(() => reject());
	});
};

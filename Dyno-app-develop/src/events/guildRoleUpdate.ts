import * as eris from '@dyno.gg/eris';

export default function guildRoleUpdate(dispatcher: any, guild: eris.Guild, role: eris.Role, oldRole: eris.Role) {
	if (!dispatcher.dyno.isReady || !guild || !role) {
		return Promise.reject(null);
	}

	if (dispatcher.config.handleRegion && !dispatcher.utils.regionEnabled(guild, dispatcher.config)) {
		return Promise.reject(null);
	}

	return new Promise((resolve: any, reject: any) => {
		dispatcher.dyno.guilds.getOrFetch(guild.id).then((guildConfig: GuildConfig) => resolve({
				guild: guild,
				role: role,
				oldRole: oldRole,
				guildConfig: guildConfig,
			})).catch(() => reject(null));
	});
}

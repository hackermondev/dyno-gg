import * as eris from '@dyno.gg/eris';

export default function guildDelete(dispatcher: any, guild: eris.Guild) {
	if (!dispatcher.dyno.isReady || !guild) {
		return Promise.reject(null);
	}
	if (dispatcher.config.handleRegion && !dispatcher.utils.regionEnabled(guild, dispatcher.config)) {
		return Promise.reject(null);
	}

	return new Promise((resolve: any, reject: any) => {
		dispatcher.dyno.guilds.getOrFetch(guild.id).then((guildConfig: GuildConfig) => resolve({
				guild: guild,
				guildConfig: guildConfig,
			})).catch(() => reject(null));
	});
}

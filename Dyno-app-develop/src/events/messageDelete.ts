import * as eris from '@dyno.gg/eris';

export default function messageDelete(dispatcher: any, message: eris.Message) {
	if (!dispatcher.dyno.isReady || (message.author && message.author.bot)) {
		return Promise.reject(null);
	}

	const guild = (<eris.GuildChannel>message.channel).guild;

	if (!guild) {
		return Promise.reject(null);
	}

	if (dispatcher.config.handleRegion && !dispatcher.utils.regionEnabled(guild, dispatcher.config)) {
		return Promise.reject(null);
	}

	return new Promise((resolve: any, reject: any) => {
		dispatcher.dyno.guilds.getOrFetch(guild.id).then((guildConfig: GuildConfig) => resolve({
				message: message,
				guild: guild,
				guildConfig: guildConfig,
			})).catch(() => reject(null));
	});
}

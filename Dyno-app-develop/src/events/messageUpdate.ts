import * as eris from '@dyno.gg/eris';

export default function messageUpdate(dispatcher: any, message: eris.Message, oldMessage: eris.Message) {
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
				oldMessage: oldMessage,
				guild: guild,
				guildConfig: guildConfig,
				isAdmin: dispatcher.dyno.permissions.isAdmin(message.author),
			})).catch(() => reject(null));
	});
}

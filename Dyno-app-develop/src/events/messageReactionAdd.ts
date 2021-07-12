import * as eris from '@dyno.gg/eris';

export default function messageReactionAdd(dispatcher: any, message: eris.Message, emoji: eris.Emoji, userId: string) {
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

	const guildConfig = dispatcher.dyno.guilds.get(guild.id);
	if (guildConfig) {
		return Promise.resolve({
			message: message,
			emoji: emoji,
			userId: userId,
			guild: guild,
			guildConfig: guildConfig,
			isAdmin: dispatcher.dyno.permissions.isAdmin(message.author),
		});
	}

	return dispatcher.dyno.guilds.getOrFetch(guild.id).then((guildConfig: GuildConfig) => { // eslint-disable-line
		return {
			message: message,
			emoji: emoji,
			userId: userId,
			guild: guild,
			guildConfig: guildConfig,
		};
	});
}

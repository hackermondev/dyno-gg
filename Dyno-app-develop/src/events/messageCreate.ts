import * as eris from '@dyno.gg/eris';

export default function messageCreate(dispatcher: any, message: eris.Message) {
	if (!dispatcher.dyno.isReady || (message.author && message.author.bot)) {
		return Promise.reject(null);
	}

	const guild = (<eris.GuildChannel>message.channel).guild;

	if (!guild || !message.author) {
		return Promise.reject(null);
	}

	if (dispatcher.config.handleRegion && !dispatcher.utils.regionEnabled(guild, dispatcher.config)) {
		return Promise.reject(null);
	}

	const guildConfig = dispatcher.dyno.guilds.get(guild.id);
	if (guildConfig) {
		return Promise.resolve({
			message: message,
			guild: guild,
			guildConfig: guildConfig,
			isAdmin: dispatcher.dyno.permissions.isAdmin(message.author),
			isOverseer: dispatcher.dyno.permissions.isOverseer(message.author),
		});
	}

	return dispatcher.dyno.guilds.getOrFetch(guild.id).then((guildConfig: GuildConfig) => {
		return {
			message: message,
			guild: guild,
			guildConfig: guildConfig,
			isAdmin: dispatcher.dyno.permissions.isAdmin(message.author),
			isOverseer: dispatcher.dyno.permissions.isOverseer(message.author),
		};
	});
}

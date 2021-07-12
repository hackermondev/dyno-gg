import * as eris from '@dyno.gg/eris';

export default function messageDeleteBulk(dispatcher: any, messages: any[]) {
	if (!dispatcher.dyno.isReady || dispatcher.config.handleRegion) {
		return Promise.reject(null);
	}

	let channel = messages[0].channel ? messages[0].channel.id : messages[0].channelID;
	if (typeof channel === 'string') {
		channel = dispatcher._client.getChannel(channel);
	}

	const guild = channel.guild || null;
	if (!guild) {
		return Promise.reject(null);
	}

	if (!dispatcher.utils.regionEnabled(guild, dispatcher.config)) {
		return Promise.reject(null);
	}

	return new Promise((resolve: any, reject: any) => {
		dispatcher.dyno.guilds.getOrFetch(guild.id).then((guildConfig: GuildConfig) => resolve({
				messages: messages,
				channel: channel,
				guild: guild,
				guildConfig: guildConfig,
			})).catch(() => reject(null));
	});
}

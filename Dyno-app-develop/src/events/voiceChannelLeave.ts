import * as eris from '@dyno.gg/eris';

export default function voiceChannelLeave(dispatcher: any, member: eris.Member, channel: eris.GuildChannel) {
	if (!dispatcher.dyno.isReady || !member || !channel.guild) {
		return Promise.reject(null);
	}

	if (dispatcher.config.handleRegion && !dispatcher.utils.regionEnabled(channel.guild, dispatcher.config)) {
		return Promise.reject(null);
	}

	return new Promise((resolve: any, reject: any) => {
		dispatcher.dyno.guilds.getOrFetch(channel.guild.id).then((guildConfig: GuildConfig) => resolve({
				member: member,
				channel: channel,
				guild: channel.guild,
				guildConfig: guildConfig,
			})).catch(() => reject(null));
	});
}

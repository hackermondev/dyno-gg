import * as eris from '@dyno.gg/eris';

export default function guildMemberUpdate(dispatcher: any, guild: eris.Guild, member: eris.Member, oldMember: eris.Member) {
	if (!dispatcher.dyno.isReady || !guild || !member) {
		return Promise.reject(null);
	}

	if (dispatcher.config.handleRegion && !dispatcher.utils.regionEnabled(guild, dispatcher.config)) {
		return Promise.reject(null);
	}

	return new Promise((resolve: any, reject: any) => {
		dispatcher.dyno.guilds.getOrFetch(guild.id).then((guildConfig: GuildConfig) => resolve({
				guild: guild,
				member: member,
				oldMember: oldMember,
				guildConfig: guildConfig,
			})).catch(() => reject(null));
	});
}

import * as eris from '@dyno.gg/eris';
import Logger from '../Logger';
import Moderator from '../Moderator';

export default function mentions(autoLogger: Logger, moderator: Moderator, e: any) {
	const { message, guildConfig, filter } = e;
	const modConfig = guildConfig.automod;
	const maxMentions = modConfig.maxMentions || 5;
	const guild = (<eris.GuildChannel>message.channel).guild;

	const mentionCount = modConfig.mentionCount || 10;

	// ban mass mentions > 10
	if (filter && message.mentions && message.mentions.length >= mentionCount) {
		if (filter.instantban) {
			return moderator.ban(guild, message, `${message.mentions.length} mentions`)
				.then(() => {
					autoLogger.log({
						message: message,
						guildConfig: guildConfig,
						type: 'mentions',
						reason: `${message.mentions.length} mentions`,
						action: 'banned',
						filter,
				});
			})
			.catch(() => moderator.mute(message, guildConfig, 0).catch(() => false)
				.then(() => {
					autoLogger.log({
						message: message,
						guildConfig: guildConfig,
						type: 'mentions',
						reason: `${message.mentions.length} mentions`,
						action: 'muted',
						modlog: true,
						filter,
					});

					message.delete();
				}));
		} else if (filter.delete) {
			if (filter.warn) {
				moderator.warnUser(message, 'Do not mass mention users!');
			}

			return moderator.delete(message).then(() => {
				autoLogger.log({
					message: message,
					guildConfig: guildConfig,
					type: 'mentionslight',
					reason: `${message.mentions.length} mentions`,
					filter,
				});
			}).catch(() => false);
		}
	}
}

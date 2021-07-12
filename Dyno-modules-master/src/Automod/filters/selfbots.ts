import * as eris from '@dyno.gg/eris';
import Logger from '../Logger';
import Moderator from '../Moderator';

export default function selfbots(autoLogger: Logger, moderator: Moderator, e: any) {
	const { message, filter, guildConfig } = e;
	const modConfig = guildConfig.automod;

	if (message.embeds && message.embeds.length && !message.content.includes('http')) {
		if (message.embeds[0].type === 'rich') {
			if (filter.delete) {
				moderator.delete(message).catch(() => false);
			}

			if (filter.warn) {
				moderator.warnUser(message, `Selfbots aren't allowed.`);
			}

			return autoLogger.log({
				message,
				filter,
				guildConfig,
				type: 'selfbot',
				msgContent: message.content,
				reason: 'using a selfbot',
			});
		}
	}
}

import * as eris from '@dyno.gg/eris';
import * as emojiRegex from 'emoji-regex';
import Logger from '../Logger';
import Moderator from '../Moderator';

const customRegex: RegExp = new RegExp(/<a?:(.*?:[0-9]+)>/, 'gi');

export default function emojis(autoLogger: Logger, moderator: Moderator, e: any) {
	const { message, filter, guildConfig } = e;

	const emojiMatch = message.content.match(emojiRegex());
	const customMatch = message.content.match(customRegex);
	let emojiCount = 0;
	if (emojiMatch && emojiMatch.length) {
		emojiCount += emojiMatch.length;
	}
	if (customMatch && customMatch.length) {
		emojiCount += customMatch.length;
	}

	const modConfig = guildConfig.automod;
	const maxEmojis = modConfig.emojiCount || 4;

	if (emojiCount && emojiCount > maxEmojis) {
		if (filter.delete) {
			moderator.delete(message).catch(() => false);
		}

		if (filter.warn) {
			moderator.warnUser(message, `Too many emojis.`);
		}

		return autoLogger.log({
			message,
			filter,
			guildConfig,
			type: 'manyemojis',
			msgContent: message.content,
			reason: 'too many emojis',
		});
	}
}

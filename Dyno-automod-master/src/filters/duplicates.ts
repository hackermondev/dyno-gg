import * as eris from '@dyno.gg/eris';
import Logger from '../Logger';
import Moderator from '../Moderator';

const clearRegex: RegExp = new RegExp(/[\n]{5,}/);
const dupRegex: RegExp = new RegExp(/(.+)\1{9,}/, 'gi');

export default function duplicates(autoLogger: Logger, moderator: Moderator, e: any) {
	const { message, filter, guildConfig } = e;

	if (message.content.indexOf('```') > -1) {
		return;
	}

	const dupMatch = message.content.match(dupRegex);

	if (dupMatch && dupMatch.length) {
		if (filter.delete) {
			moderator.delete(message).catch(() => false);
		}

		if (filter.warn) {
			moderator.warnUser(message, 'No spamming.');
		}

		return autoLogger.log({
			message,
			filter,
			guildConfig,
			type: 'spamdup',
			msgContent: message.content,
			reason: 'duplicated characters/words',
		});
	}

	const content = message.content.replace(/(\u200b|\*|_|~|`| )/g, '');
	const clearMatch = content.match(clearRegex);

	if (clearMatch && clearMatch.length) {
		if (filter.delete) {
			moderator.delete(message).catch(() => false);
		}

		if (filter.warn) {
			moderator.warnUser(message, 'No spamming.');
		}

		return autoLogger.log({
			message,
			filter,
			guildConfig,
			type: 'spamclear',
			msgContent: message.content,
			reason: 'chat clearing newlines',
			infraction: 1,
		});
	}
}

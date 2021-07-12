import * as eris from '@dyno.gg/eris';
import * as path from 'path';
import Logger from '../Logger';
import Moderator from '../Moderator';

const spoilerRegex: RegExp = new RegExp(/\|\|(.+?)\|\|/, 'gi');

export default function spoilers(autoLogger: Logger, moderator: Moderator, e: any) {
	const { message, filter, guildConfig } = e;
	const modConfig = guildConfig.automod;

	const match = message.content.match(spoilerRegex);
	if (match && match.length) {
		if (filter.delete) {
			moderator.delete(message).catch(() => false);
		}

		if (filter.warn) {
			moderator.warnUser(message, `No spoilers allowed.`);
		}

		return autoLogger.log({
			message: message,
			filter: filter,
			guildConfig: guildConfig,
			type: 'spoilers',
			reason: 'spoilers',
		});
	}

	if (message.attachments && message.attachments.length) {
		if (message.attachments.find(a => path.basename(a.url).toUpperCase().startsWith('SPOILER_'))) {
			if (filter.delete) {
				moderator.delete(message).catch(() => false);
			}

			if (filter.warn) {
				moderator.warnUser(message, `No spoilers allowed.`);
			}

			return autoLogger.log({
				message: message,
				filter: filter,
				guildConfig: guildConfig,
				type: 'spoilers',
				reason: 'spoilers',
			});
		}
	}
}

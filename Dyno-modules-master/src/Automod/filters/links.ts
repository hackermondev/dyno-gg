import * as eris from '@dyno.gg/eris';
import Logger from '../Logger';
import Moderator from '../Moderator';

export default function links(autoLogger: Logger, moderator: Moderator, e: any) {
	const { message, filter, guildConfig } = e;
	const modConfig = guildConfig.automod;

	let skipUrl = false;

	if (modConfig.whiteurls && modConfig.whiteurls.length) {
		for (const url of modConfig.whiteurls) {
			if (message.content.indexOf(url) > -1) {
				skipUrl = true;
			}
		}
	}

	if (!skipUrl) {
		if (filter.delete) {
			moderator.delete(message).catch(() => false);
		}

		if (filter.warn) {
			moderator.warnUser(message, `No links allowed.`);
		}

		return autoLogger.log({
			message,
			filter,
			guildConfig,
			type: 'anylink',
			msgContent: message.content,
			reason: 'contains link',
		});
	}
}

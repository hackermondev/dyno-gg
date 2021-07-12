import * as eris from '@dyno.gg/eris';
import Logger from '../Logger';
import Moderator from '../Moderator';

const textRegex: RegExp = new RegExp(/[^a-zA-Z0-9]/, 'g');
const capsRegex: RegExp = new RegExp(/[A-Z]/, 'g');

export default function caps(autoLogger: Logger, moderator: Moderator, e: any) {
	const { message, filter, guildConfig } = e;
	const modConfig = guildConfig.automod;

	const capsText = message.content.replace(textRegex, '');
	const capsPerc = 1 - (capsText.replace(capsRegex, '').length / capsText.length);

	if (capsText.length > 6 && capsPerc > 0.7) {
		if (filter.delete) {
			moderator.delete(message).catch(() => false);
		}

		if (filter.warn) {
			moderator.warnUser(message, `Too many caps.`);
		}

		return autoLogger.log({
			message,
			filter,
			guildConfig,
			type: 'manycaps',
			msgContent: message.content,
			reason: 'too many caps',
		});
	}
}

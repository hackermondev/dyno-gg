import * as eris from '@dyno.gg/eris';
import Logger from '../Logger';
import Moderator from '../Moderator';

const inviteRegex: RegExp = new RegExp(/discord(?:app.com\/invite|.gg|.me|.io)(?:[\\]+)?\/([a-zA-Z0-9\-]+)/, 'gi');

export default function invites(autoLogger: Logger, moderator: Moderator, e: any) {
	const { message, filter, guildConfig } = e;
	const modConfig = guildConfig.automod;

	const match = message.content.match(inviteRegex);
	if (match && match.length) {
		if (filter.delete) {
			moderator.delete(message).catch(() => false);
		}

		if (filter.warn) {
			moderator.warnUser(message, 'No invite links.');
		}

		return autoLogger.log({
			message: message,
			filter: filter,
			guildConfig: guildConfig,
			type: 'invite',
			reason: 'invite link',
		});
	}
}

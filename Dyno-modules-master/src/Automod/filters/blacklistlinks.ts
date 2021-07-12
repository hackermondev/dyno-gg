import { utils } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import Logger from '../Logger';
import Moderator from '../Moderator';

let guildRegex: Map<string, RegExp> = new Map();

setInterval(() => {
	guildRegex = new Map();
}, 30000);

export default function blacklistLinks(autoLogger: Logger, moderator: Moderator, e: any) {
	const { message, guildConfig } = e;
	const modConfig = guildConfig.automod;
	const guild = (<eris.GuildChannel>message.channel).guild;

	let regex;

	if (guildRegex.has(`${guild.id}:blacklist`)) {
		regex = guildRegex.get(`${guild.id}:blacklist`);
	} else {
		const urls = modConfig.blackurls.filter((u: string) => u && u.length)
			.map((u: string) => utils.regEscape(u.replace(/\*/g, '')));

		regex = new RegExp(urls.join('|'), 'gi');
		guildRegex.set(`${guild.id}:blacklist`, regex);
	}

	const blMatch = message.content.match(regex);

	const filter = e.filter || {
		delete: true,
		warn: true,
		automute: true,
	};

	if (blMatch) {
		if (filter.delete) {
			moderator.delete(message).catch(() => false);
		}

		if (filter.warn) {
			moderator.warnUser(message, 'That link is not allowed.');
		}

		return autoLogger.log({
			message,
			filter,
			guildConfig,
			type: 'blacklistlink',
			msgContent: message.content,
			reason: 'blacklisted link',
		});
	}
}

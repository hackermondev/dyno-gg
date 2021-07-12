import * as eris from '@dyno.gg/eris';
import * as emojiRegex from 'emoji-regex';
import Logger from '../Logger';
import Moderator from '../Moderator';

const customRegex: RegExp = new RegExp(/<a?:(.*?:[0-9]+)>/, 'gi');
const emojiCooldowns: Map<string, EmojiCooldown> = new Map();

setInterval(() => {
	if (emojiCooldowns.size) {
		each([...emojiCooldowns.keys()], (key: string) => {
			const cooldown = emojiCooldowns.get(key);
			if ((Date.now() - cooldown.time) >= cooldown.limit) {
				emojiCooldowns.delete(key);
			}
		});
	}
}, 60000);

export default function emojicooldown(autoLogger: Logger, moderator: Moderator, e: any) {
	const { message, filter, guildConfig } = e;
	const modConfig = guildConfig.automod;
	const guild = (<eris.GuildChannel>message.channel).guild;
	const key = `${guild.id}${message.member.id}`;

	const emojiMatch = message.content.match(emojiRegex());
	const customMatch = message.content.match(customRegex);
	let emojiCount = 0;
	if (emojiMatch && emojiMatch.length) {
		emojiCount += emojiMatch.length;
	}
	if (customMatch && customMatch.length) {
		emojiCount += customMatch.length;
	}

	// const modConfig = guildConfig.automod;
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

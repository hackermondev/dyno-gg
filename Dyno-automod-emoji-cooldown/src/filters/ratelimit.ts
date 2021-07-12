import * as eris from '@dyno.gg/eris';
import * as each from 'async-each';
import Logger from '../Logger';
import Moderator from '../Moderator';

const rateLimits: Map<string, any> = new Map();

setInterval(() => {
	if (rateLimits.size) {
		each([...rateLimits.keys()], (key: string) => {
			const limit = rateLimits.get(key);
			if (Date.now() - limit.createdAt < 4000) {
				return;
			}
			rateLimits.delete(key);
		});
	}
}, 60000);

export default function ratelimit(autoLogger: Logger, moderator: Moderator, e: any) {
	const { message, guild, guildConfig, filter } = e;
	const modConfig = guildConfig.automod;

	const limit = rateLimits.get(message.author.id);

	if (!limit || !limit.createdAt) {
		rateLimits.set(message.author.id, {
			createdAt: Date.now(),
			ids: [message.id],
		});
		return;
	}

	limit.ids = limit.ids || [];
	limit.ids.push(message.id);

	const diff = Date.now() - limit.createdAt;

	if (diff < 4000 && limit.ids.length >= 5) {
		limit.ids.push(message.id);

		if (filter.warn) {
			process.nextTick(() => moderator.warnUser(message, `You're sending messages too quick!`));
		}

		const diffSec = diff / 1000;
		const count = limit.ids.length;
		const ids: any[] = [...new Set(limit.ids)];

		if (filter.delete) {
			moderator.bulkDelete(guild, message.channel, ids).catch((err: any) => console.error(err));
		}

		rateLimits.delete(message.author.id);

		return autoLogger.log({
			message: message,
			guildConfig: guildConfig,
			type: 'ratelimit',
			reason: `Sent ${count} messages in ${diffSec.toFixed(2)}s`,
			filter,
		});
	} else if (diff > 4000) {
		rateLimits.set(message.author.id, {
			createdAt: Date.now(),
			ids: [message.id],
		});
	}
}

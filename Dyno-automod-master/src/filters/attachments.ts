import * as eris from '@dyno.gg/eris';
import * as each from 'async-each';
import Logger from '../Logger';
import Moderator from '../Moderator';

const attachCooldowns: Map<string, LinkCooldown> = new Map();

setInterval(() => {
	if (attachCooldowns.size) {
		each([...attachCooldowns.keys()], (key: string) => {
			const cooldown = attachCooldowns.get(key);
			if (Date.now() - cooldown.time >= cooldown.limit) {
				attachCooldowns.delete(key);
			}
		});
	}
}, 60000);

export default function attachments(autoLogger: Logger, moderator: Moderator, e: any) {
	const { message, filter, guildConfig } = e;
	const modConfig = guildConfig.automod;
	const guild = (<eris.GuildChannel>message.channel).guild;

	if ((message.attachments && message.attachments.length) || (message.embeds && message.embeds.length)) {
		if ((message.attachments && message.attachments.length > 4) || (message.embeds && message.embeds.length > 4)) {
			if (filter.delete) {
				moderator.delete(message).catch(() => false);
			}

			if (filter.warn) {
				moderator.warnUser(message, 'Too many attachments.');
			}

			return autoLogger.log({
				message,
				filter,
				guildConfig,
				type: 'attachments',
				msgContent: message.content,
				reason: 'too many attachments',
			});
		}

		const cooldown = attachCooldowns.get(`${guild.id}${message.author.id}`);

		if (cooldown && cooldown.count > 2 && (Date.now() - cooldown.time) < 10000) {
			cooldown.count++;

			if (filter.delete) {
				moderator.delete(message).catch(() => false);
			}

			if (filter.warn) {
				moderator.warnUser(message, `You're posting too fast.`);
			}

			return autoLogger.log({
				message,
				filter,
				guildConfig,
				type: 'attachcooldown',
				msgContent: message.content,
				reason: 'possible image spam',
			});
		}

		attachCooldowns.set(`${guild.id}${message.author.id}`, {
			guild: guild,
			user: message.author,
			time: Date.now(),
			count: 1,
			limit: 10000,
		});
	}
}

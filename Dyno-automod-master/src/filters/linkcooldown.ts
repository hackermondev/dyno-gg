import * as eris from '@dyno.gg/eris';
import * as each from 'async-each';
import Logger from '../Logger';
import Moderator from '../Moderator';

const linkCooldowns: Map<string, LinkCooldown> = new Map();

setInterval(() => {
	if (linkCooldowns.size) {
		each([...linkCooldowns.keys()], (key: string) => {
			const cooldown = linkCooldowns.get(key);
			if ((Date.now() - cooldown.time) >= cooldown.limit) {
				linkCooldowns.delete(key);
			}
		});
	}
}, 60000);

export default function linkcooldown(autoLogger: Logger, moderator: Moderator, e: any) {
	const { message, filter, guildConfig } = e;
	const modConfig = guildConfig.automod;
	const guild = (<eris.GuildChannel>message.channel).guild;
	const key = `${guild.id}${message.member.id}`;

	const cooldown = linkCooldowns.get(key);
	const linkCooldown = modConfig.linkCooldown || 20;

	if (cooldown && cooldown.time && (Date.now() - cooldown.time) < (parseInt(linkCooldown, 10) * 1000)) {
		cooldown.count++;

		if (filter.delete) {
			moderator.delete(message).catch(() => false);
		}

		if (filter.warn) {
			moderator.warnUser(message, `You're posting links too fast.`);
		}

		return autoLogger.log({
			message,
			filter,
			guildConfig,
			type: 'linkcooldown',
			msgContent: message.content,
			reason: 'link cooldown',
		});
	} else {
		linkCooldowns.set(`${guild.id}${message.member.id}`, {
			guild: guild,
			user: message.member,
			time: Date.now(),
			count: 1,
			limit: (parseInt(modConfig.linkCooldown || 20, 10) * 1000),
		});
	}
}

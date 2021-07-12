import { utils } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import Logger from '../Logger';
import Moderator from '../Moderator';

const globalWords: string[] = [
	'fuck', 'nigg', 'fuk', 'cunt', 'cnut', 'bitch',
	'dick', 'd1ck', 'pussy', 'asshole', 'b1tch',
	'b!tch', 'blowjob', 'cock', 'c0ck',
];
let guildLists: Map<string, any> = new Map();
let guildRegex: Map<string, RegExp> = new Map();

setInterval(() => {
	guildLists = new Map();
	guildRegex = new Map();
}, 30000);

export default function words(autoLogger: Logger, moderator: Moderator, e: any) {
	const { message, filter, guildConfig } = e;
	const modConfig = guildConfig.automod;
	const guild = (<eris.GuildChannel>message.channel).guild;

	let guildList = modConfig.badwords || [];
	let exactList = modConfig.exactwords || [];

	guildList = guildList && [...new Set(guildList)];
	exactList = exactList && [...new Set(exactList)];

	if (modConfig.disableGlobal && !guildList.length && !exactList.length) {
		return;
	}

	// get mapped guild list from cache if exists
	if (guildLists.has(guild.id)) {
		guildList = guildLists.get(guild.id);
	} else {
		guildList = guildList.map((w: string) => {
			w = utils.regEscape(w);
			return w.replace(/(^\s)/, '(?:^|\\s)').replace(/\s$/, '(?:\\s|$)');
		});

		guildList = guildList.concat(exactList.map((w: string) => {
			w = utils.regEscape(w);
			return `(?:^|[^\\w])${w}(?:[^\\w]|$)`;
		}));

		// cache mapped server list
		guildLists.set(guild.id, guildList);
	}

	let badRegex = new RegExp(globalWords.join('|'), 'gi');

	// get cached regex if exists
	if (guildRegex.has(guild.id)) {
		badRegex = guildRegex.get(guild.id);
	} else {
		// ignore global words if set
		if (modConfig.disableGlobal) {
			badRegex = new RegExp(guildList.filter((w: string) => w.length > 2).join('|'), 'gi');
		} else {
			const bannedWords = globalWords.concat(guildList);
			badRegex = (bannedWords !== globalWords) ? new RegExp(bannedWords.join('|'), 'gi') : badRegex;
		}

		// cache the regex
		guildRegex.set(guild.id, badRegex);
	}

	if (badRegex && message.content.match(badRegex)) {
		if (filter.delete) {
			moderator.delete(message).catch(() => false);
		}

		if (filter.warn) {
			moderator.warnUser(message, 'Watch your language.');
		}

		return autoLogger.log({
			message: message,
			guildConfig: guildConfig,
			type: 'badwords',
			msgContent: message.content,
			reason: 'bad words',
			filter,
		});
	}
}

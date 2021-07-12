import * as eris from '@dyno.gg/eris';
import Utils from './Utils';

const utils = new Utils();

export default class Resolver {
	/**
	 * Resolve username/id/mention
	 */
	public static user(guild: eris.Guild, user: string, context?: any[], exact?: boolean): eris.Member|eris.User {
		if (!user) {
			return null;
		}

		let users = [];

		if (context) {
			users = context;
		} else {
			users = guild ? [...guild.members.values()] : [];
		}

		if (!users || !users.length) {
			return null;
		}

		// check if it's a mention
		const regex = exact ? '<@!?([0-9]+)>$' : '<@!?([0-9]+)>';
		const mentionId = new RegExp(regex, 'g').exec(user);
		if (mentionId && mentionId.length > 1) {
			return users.find((u: eris.Member) => u.id === mentionId[1]);
		}

		// check if it's username#1337
		if (user.indexOf('#') > -1) {
			const [name, discrim] = user.split('#');
			const nameDiscrimSearch = users.find((u: eris.Member) => u.username === name && u.discriminator === discrim);
			if (nameDiscrimSearch) {
				return nameDiscrimSearch;
			}
		}

		// check if it's an id
		if (user.match(/^([0-9]+)$/)) {
			const userIdSearch = users.find((u: eris.Member) => u.id === user);
			if (userIdSearch) {
				return userIdSearch;
			}
		}

		const exactNameSearch = users.find((u: eris.Member) => u.username === user);
		if (exactNameSearch) {
			return exactNameSearch;
		}

		if (!exact) {
			const escapedUser = utils.regEscape(user);
			// username match
			const userNameSearch = users.find((u: eris.Member) => u.username.match(new RegExp(`^${escapedUser}.*`, 'i')) != undefined);
			if (userNameSearch) {
				return userNameSearch;
			}
		}

		return null;
	}

	public static role(guild: eris.Guild, role: string): eris.Role {
		const mention = new RegExp('<@&([0-9]+)>', 'g').exec(role);
		if (mention && mention.length > 1) {
			return guild.roles.get(mention[1]);
		}

		if (role.match(/^([0-9]+)$/)) {
			const roleIdSearch = guild.roles.get(role);
			if (roleIdSearch) {
				return roleIdSearch;
			}
		}

		const exactNameSearch = guild.roles.find((r: eris.Role) => r.name.toLowerCase() === role.toLowerCase());
		if (exactNameSearch) {
			return exactNameSearch;
		}

		const escapedRole = utils.regEscape(role);

		const roleNameSearch = guild.roles.find((r: eris.Role) => r.name.match(new RegExp(`^${escapedRole}.*`, 'i')) != undefined);
		if (roleNameSearch) {
			return roleNameSearch;
		}

		return null;
	}

	public static channel(guild: eris.Guild, channel: string) {
		const mention = new RegExp('<#([0-9]+)', 'g').exec(channel);
		if (mention && mention.length > 1) {
			return guild.channels.get(mention[1]);
		}

		if (channel.match(/^([0-9]+)$/)) {
			const channelIdSearch = guild.channels.get(channel);
			if (channelIdSearch) {
				return channelIdSearch;
			}
		}

		const channelNameSearch = guild.channels.find((c: eris.GuildChannel) => c.name === channel);
		if (channelNameSearch) {
			return channelNameSearch;
		}
	}
}

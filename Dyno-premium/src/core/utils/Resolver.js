'use strict';

const utils = require('./index');

class Resolver {
	/**
	 * Resolve username/id/mention
	 * @param   {Guild} guild   Guild object
	 * @param   {String} user   User id, name or mention
	 * @param   {Array} [context] An array of users ids to search instead of guild.members
	 * @returns {Member|User|null} Resolved member, user or null
	 */
	static user(guild, user, context, exact) {
		if (!user) return null;

		let users = [];

		if (context) {
			users = context;
		} else {
			users = guild ? [...guild.members.values()] : [];
		}

		if (!users || !users.length) return null;

		// check if it's a mention
		let mentionId = new RegExp('<@!?([0-9]+)>', 'g').exec(user);
		if (mentionId && mentionId.length > 1) {
			return users.find(u => u.id === mentionId[1]);
		}

		// check if it's username#1337
		if (user.indexOf('#') > -1) {
			let [name, discrim] = user.split('#'),
				nameDiscrimSearch = users.find(u => u.username === name && u.discriminator === discrim);
			if (nameDiscrimSearch) return nameDiscrimSearch;
		}

		// check if it's an id
		if (user.match(/^([0-9]+)$/)) {
			let userIdSearch = users.find(u => u.id === user);
			if (userIdSearch) return userIdSearch;
		}

		let exactNameSearch = users.find(u => u.username === user);
		if (exactNameSearch) return exactNameSearch;

		if (!exact) {
			const escapedUser = utils.regEscape(user);
			// username match
			let userNameSearch = users.find(u => u.username.match(new RegExp(`^${escapedUser}.*`, 'i')));
			if (userNameSearch) return userNameSearch;
		}

		return null;
	}

	static role(guild, role) {
		let mention = new RegExp('<@&([0-9]+)>', 'g').exec(role);
		if (mention && mention.length > 1) {
			return guild.roles.get(mention[1]);
		}

		if (role.match(/^([0-9]+)$/)) {
			let roleIdSearch = guild.roles.get(role);
			if (roleIdSearch) return roleIdSearch;
		}

		let exactNameSearch = guild.roles.find(r => r.name.toLowerCase() === role.toLowerCase());
		if (exactNameSearch) return exactNameSearch;

		const escapedRole = utils.regEscape(role);

		let roleNameSearch = guild.roles.find(r => r.name.match(new RegExp(`^${escapedRole}.*`, 'i')));
		if (roleNameSearch) return roleNameSearch;

		return null;
	}

	static channel(guild, channel) {
		let mention = new RegExp('<#([0-9]+)', 'g').exec(channel);
		if (mention && mention.length > 1) {
			return guild.channels.get(mention[1]);
		}

		if (channel.match(/^([0-9]+)$/)) {
			let channelIdSearch = guild.channels.get(channel);
			if (channelIdSearch) return channelIdSearch;
		}

		let channelNameSearch = guild.channels.find(c => c.name === channel);
		if (channelNameSearch) return channelNameSearch;
	}
}

module.exports = Resolver;

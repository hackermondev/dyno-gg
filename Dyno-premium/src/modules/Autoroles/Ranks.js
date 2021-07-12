'use strict';

const each = require('async-each');
const Base = Loader.require('./core/structures/Base');
const utils = Loader.require('./core/utils');

class Ranks extends Base {
	constructor(module) {
		super();
		this.module = module;
	}


	/**
	 * Create a self-assignable rank
	 * @param {Guild} guild Guild object
	 * @param {Role} role Role object
	 * @param {String} name Rank name
	 * @return {Promise}
	 */
	createRank(guild, role, name) {
		const guildConfig = this.dyno.guilds.get(guild.id);
		if (!guildConfig) return Promise.reject('Error getting server configuration.');

		if (!this.module.isEnabled(guild, this.module, guildConfig)) {
			return Promise.reject('Enable the Autoroles module to use ranks.');
		}

		guildConfig.autoroles = guildConfig.autoroles || {};
		guildConfig.autoroles.ranks = guildConfig.autoroles.ranks || [];

		guildConfig.autoroles.ranks.push({
			id: role.id,
			name: name,
		});

		return new Promise((resolve, reject) => {
			this.dyno.guilds.update(guild.id, { $set: { 'autoroles.ranks': guildConfig.autoroles.ranks } })
				.then(resolve)
				.catch(reject);
		});
	}

	/**
	 * Delete a self-assignable rank
	 * @param {Guild} guild Guild object
	 * @param {Role} role Role object
	 * @return {Promise}
	 */
	async deleteRank(guild, role) {
		const guildConfig = await this.dyno.guilds.getOrFetch(guild.id);
		if (!guildConfig) return Promise.reject('Error getting server configuration.');

		if (!this.module.isEnabled(guild, this.module, guildConfig)) return Promise.reject();

		guildConfig.autoroles = guildConfig.autoroles || {};
		guildConfig.autoroles.ranks = guildConfig.autoroles.ranks || [];

		const index = guildConfig.autoroles.ranks.findIndex(r => r.name.toLowerCase() === role.toLowerCase());

		if (index === -1) return Promise.reject('Rank not found.');

		guildConfig.autoroles.ranks.splice(index, 1);

		return new Promise((resolve, reject) => {
			this.dyno.guilds.update(guild.id, { $set: { 'autoroles.ranks': guildConfig.autoroles.ranks } })
				.then(resolve)
				.catch(reject);
		});
	}

	/**
	 * Toggle a self-assignable rank
	 * @param {Message} msg Message object
	 * @param {String} rank Rank name
	 * @return {Promise}
	 */
	async toggleRank(msg, rank) {
		const guildConfig = await this.dyno.guilds.getOrFetch(msg.channel.guild.id);

		if (!guildConfig) return Promise.reject('Error getting server configuration.');
		if (!guildConfig.autoroles || !guildConfig.autoroles.ranks) return Promise.reject();

		if (!this.module.isEnabled(msg.channel.guild, this.module, guildConfig)) return Promise.reject();

		rank = guildConfig.autoroles.ranks.find(r => r.name.toLowerCase() === rank.toLowerCase());

		if (!rank) return Promise.reject(`Rank doesn't exist.`);

		const role = msg.channel.guild.roles.find(r => r.id === rank.id);

		if (!role) return Promise.reject(`Role no longer exists.`);

		const roles = [...msg.member.roles];
		let leftRank = false;

		if (guildConfig.autoroles.disableMulti && !msg.member.roles.includes(role.id)) {
			let matchedRole = msg.member.roles.find(id =>
				guildConfig.autoroles.ranks.find(r => r.id === id));

			if (matchedRole) {
				let index = roles.indexOf(matchedRole.id);
				if (index > -1) {
					leftRank = Object.create(matchedRole);
					roles.splice(index, 1);
				}
			}
		}

		const index = roles.indexOf(role.id);

		if (index > -1) {
			roles.splice(index, 1);
			return new Promise((resolve, reject) =>
				msg.member.edit({ roles })
					.then(() => resolve(`${msg.member.mention}, you left **${rank.name}**.`))
					.catch(() => reject(`I Couldn't remove the user from that role.`)));
		}

		roles.push(role.id);
		return new Promise((resolve, reject) =>
			msg.member.edit({ roles })
				.then(() => {
					let text = `${msg.member.mention}, you joined **${rank.name}**`;
					if (leftRank) text += `, and you were removed from **${leftRank.name}**`;
					resolve(`${text}.`);
				})
				.catch(() => reject(`I Couldn't add user to that role.`)));
	}

	/**
	 * Get joinable ranks for a guild
	 * @param {Guild} guild Guild object
	 * @return {Promise}
	 */
	async getRanks(guild) {
		const guildConfig = await this.dyno.guilds.getOrFetch(guild.id);

		if (!guildConfig) return Promise.reject('Error getting server configuration.');
		if (!guildConfig.autoroles || !guildConfig.autoroles.ranks)
			return Promise.resolve('There are no ranks on this server.');

		if (!this.module.isEnabled(guild, this.module, guildConfig)) return Promise.reject();

		let ranks = guildConfig.autoroles.ranks;

		if (!ranks.length) return Promise.resolve('There are no ranks on this server.');

		ranks = ranks.map(rank => {
			let members = guild.members.filter(m => m.roles.includes(rank.id));
			rank.memberCount = members && members.length ? members.length : 0;
			return rank;
		});

		let len = Math.max(...ranks.map(r => r.name.length)),
			mlen = Math.max(...ranks.map(r => r.memberCount.toString().length));

		let embed = {
			color: utils.getColor('blue'),
			title: 'Ranks',
			footer: { text: `Use the ${guildConfig.prefix}rank command to join a rank` },
		};

		let fields = [];

		return new Promise(resolve => {
			each(ranks, (rank, next) => {
				fields.push(`\`${utils.pad(rank.name, len)} ${utils.pad(rank.memberCount.toString(), mlen)} members\``);
				return next();
			}, () => {
				if (fields.length) {
					let messageParts = utils.splitMessage(fields, 2000);
					embed.description = messageParts[0];

					if (messageParts.length > 1) {
						fields = utils.splitMessage(messageParts[1], 1000);

						embed.fields = [];
						for (let field of fields) {
							embed.fields.push({ name: '\u200b', value: field });
						}
					}
				} else {
					embed.description = 'There are no ranks on this server.';
				}

				return resolve({ embed });
			});
		});

		// return Promise.resolve(msgArray.join('\n'));
	}
}

module.exports = Ranks;

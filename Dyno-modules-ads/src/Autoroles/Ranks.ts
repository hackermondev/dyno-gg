import {Base} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as each from 'async-each';
import * as dyno from 'Dyno';
import Autoroles from '.';
import { RankObject } from '../types/autoroles';

export default class Ranks extends Base {
	public module: Autoroles;

	constructor(dynoInstance: dyno.Dyno, module: Autoroles) {
		super(dynoInstance);
		this.module = module;
	}

	/**
	 * Create a self-assignable rank
	 * @param {Guild} guild Guild object
	 * @param {Role} role Role object
	 * @param {String} name Rank name
	 * @return {Promise}
	 */
	public createRank(guild: eris.Guild, role: eris.Role, name: string) {
		const guildConfig = this.dyno.guilds.get(guild.id);
		if (!guildConfig) {
			return Promise.reject('Error getting server configuration.');
		}

		if (!this.module.isEnabled(guild, this.module, guildConfig)) {
			return Promise.reject('Enable the Autoroles module to use ranks.');
		}

		guildConfig.autoroles = guildConfig.autoroles || {};
		guildConfig.autoroles.ranks = guildConfig.autoroles.ranks || [];

		guildConfig.autoroles.ranks.push({
			id: role.id,
			name: name,
		});

		return new Promise((resolve: Function, reject: Function) => {
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
	public async deleteRank(guild: eris.Guild, role: string) {
		const guildConfig = await this.dyno.guilds.getOrFetch(guild.id);
		if (!guildConfig) {
			return Promise.reject('Error getting server configuration.');
		}

		if (!this.module.isEnabled(guild, this.module, guildConfig)) {
			return Promise.reject(null);
		}

		guildConfig.autoroles = guildConfig.autoroles || {};
		guildConfig.autoroles.ranks = guildConfig.autoroles.ranks || [];

		const index = guildConfig.autoroles.ranks.findIndex((r: RankObject) => r.name.toLowerCase() === role.toLowerCase());

		if (index === -1) {
			return Promise.reject('Rank not found.');
		}

		guildConfig.autoroles.ranks.splice(index, 1);

		return this.dyno.guilds.update(guild.id, { $set: { 'autoroles.ranks': guildConfig.autoroles.ranks } });
	}

	/**
	 * Toggle a self-assignable rank
	 * @param {Message} message Message object
	 * @param {String} rank Rank name
	 * @return {Promise}
	 */
	public async toggleRank(message: eris.Message, rank: string) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		const guildConfig = await this.dyno.guilds.getOrFetch(guild.id);

		if (!guildConfig) {
			return Promise.reject('Error getting server configuration.');
		}
		if (!guildConfig.autoroles || !guildConfig.autoroles.ranks) {
			return Promise.reject(null);
		}

		if (!this.module.isEnabled(guild, this.module, guildConfig)) {
			return Promise.reject(null);
		}

		const foundRank = guildConfig.autoroles.ranks.find((r: RankObject) => r.name.toLowerCase() === rank.toLowerCase());

		if (!foundRank) {
			return Promise.reject(`That rank doesn't exist.`);
		}

		const role = guild.roles.find((r: eris.Role) => r.id === foundRank.id);

		if (!role) {
			return Promise.reject(`That role no longer exists.`);
		}

		const roles = [...message.member.roles];
		let leftRank;

		if (guildConfig.autoroles.disableMulti && !message.member.roles.includes(role.id)) {
			const idx = message.member.roles.findIndex((id: string) =>
				guildConfig.autoroles.ranks.find((r: RankObject) => r.id === id));
			const matchedRole = guild.roles.get(message.member.roles[idx]);

			if (matchedRole) {
				if (idx > -1) {
					leftRank = Object.create(matchedRole);
					roles.splice(idx, 1);
				}
			}
		}

		const index = roles.indexOf(role.id);

		if (index > -1) {
			roles.splice(index, 1);
			try {
				await this.client.editGuildMember(guild.id, message.member.id, { roles });
				setTimeout(() => this.updateMembers(guild, guildConfig, role), 500);
				return `${message.member.mention}, you left **${foundRank.name}**.`;
			} catch {
				return Promise.reject(`I couldn't remove you from that role.`);
			}
		}

		roles.push(role.id);
		try {
			await this.client.editGuildMember(guild.id, message.member.id, { roles });
			setTimeout(() => this.updateMembers(guild, guildConfig, role), 500);
			let text = `${message.member.mention}, you joined **${foundRank.name}**`;
			if (leftRank) {
				text += `, and you were removed from **${leftRank.name}**`;
			}
			return `${text}.`;
		} catch {
			return Promise.reject(`I couldn't add you to that role.`);
		}
	}

	/**
	 * Get joinable ranks for a guild
	 * @param {Guild} guild Guild object
	 * @return {Promise}
	 */
	public async getRanks(guild: eris.Guild) {
		const guildConfig = await this.dyno.guilds.getOrFetch(guild.id);

		if (!guildConfig) {
			return Promise.reject('Error getting server configuration.');
		}
		if (!guildConfig.autoroles || !guildConfig.autoroles.ranks) {
			return Promise.resolve('There are no ranks on this server.');
		}

		if (!this.module.isEnabled(guild, this.module, guildConfig)) {
			return Promise.reject(null);
		}

		let ranks = guildConfig.autoroles.ranks;

		if (!ranks.length) {
			return Promise.resolve('There are no ranks on this server.');
		}

		ranks = ranks.map((rank: RankObject) => {
			const members = guild.members.filter((m: eris.Member) => m.roles.includes(rank.id));
			rank.memberCount = members && members.length ? members.length : 0;
			return rank;
		});

		const len = Math.max(...ranks.map((r: RankObject) => r.name.length));
		const mlen = Math.max(...ranks.map((r: RankObject) => r.memberCount.toString().length));

		const embed: any = {
			color: this.utils.getColor('blue'),
			title: 'Ranks',
			footer: { text: `Use the ${guildConfig.prefix}rank command to join a rank` },
		};

		let fields = [];

		return new Promise((resolve: Function) => {
			each(ranks, (rank: RankObject, next: Function) => {
				fields.push(`\`${this.utils.pad(rank.name, len)} ${this.utils.pad(rank.memberCount.toString(), mlen)} members\``);
				return next();
			}, () => {
				if (fields.length) {
					const messageParts = this.utils.splitMessage(fields, 2000);
					embed.description = messageParts[0];

					if (messageParts.length > 1) {
						fields = this.utils.splitMessage(messageParts[1], 1000);

						embed.fields = [];
						for (const field of fields) {
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

	private updateMembers(guild: eris.Guild, guildConfig: any, role: eris.Role) {
		const members = guild.members.filter((m: eris.Member) => m.roles.includes(role.id));
		const index = guildConfig.autoroles.ranks.findIndex((r: RankObject) => r.id === role.id);

		guildConfig.autoroles.ranks[index].memberCount = members.length;

		if (guildConfig.autoroles.ranks[index].name !== role.name) {
			guildConfig.autoroles.ranks[index].name = role.name;
		}

		this.dyno.guilds.update(guild.id, { $set: { 'autoroles.ranks': guildConfig.autoroles.ranks } })
			.catch(() => null);
	}
}

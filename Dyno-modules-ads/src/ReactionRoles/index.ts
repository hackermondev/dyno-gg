import { Module } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as dyno from 'Dyno';
import emojis from '../Autoresponder/emojis';

/**
 * ReactionRoles Module
 * @class ReactionRoles
 * @extends Module
 */
export default class ReactionRoles extends Module {
	public module         : string  = 'ReactionRoles';
	public friendlyName   : string  = 'Reaction Roles';
	public description    : string  = 'Allow members to self-assign roles by reacting.';
	public list           : boolean = true;
	public enabled        : boolean = false;
	public hasPartial     : boolean = true;
	public defaultEnabled : boolean = false;

	private _emojis: any;

	get settings() {
		return {
			messages: [{
				id: String,
				channel: String,
				roles: [{
					roleId: String,
					emoji: Object,
					description: String,
				}],
			}],
		};
	}

	public start() {
		this._emojis = Object.values(emojis).reduce((a: any[], arr: any[]) => a.concat(arr), []);
	}

	public messageReactionAdd({ message, emoji, userId, guild, guildConfig }: any) {
		if (!guildConfig || !guildConfig.reactionroles || !guildConfig.reactionroles.messages) { return; }
		if (!this.isEnabled(guild, this.module, guildConfig)) { return; }

		if (!this.hasPermissions(message.channel.guild, 'manageRoles')) {
			return;
		}

		const msgConfig = guildConfig.reactionroles.messages.find(m => m.id === message.id);
		if (!msgConfig) {
			return;
		}

		const reactionRole = msgConfig.roles.find(r => (emoji.id && r.emojiId === emoji.id) || r.native === emoji.name);
		if (!reactionRole) { return; }
		this.client.addGuildMemberRole(guild.id, userId, reactionRole.roleId, 'Dyno Reaction Roles').catch(() => null);

		this.dyno.internalEvents.emit('reactionroles', { type: 'add', guild: guild });
	}

	public messageReactionRemove({ message, emoji, userId, guild, guildConfig }: any) {
		if (!guildConfig || !guildConfig.reactionroles || !guildConfig.reactionroles.messages) { return; }
		if (!this.isEnabled(guild, this.module, guildConfig)) { return; }

		if (!this.hasPermissions(message.channel.guild, 'manageRoles')) {
			return;
		}

		const msgConfig = guildConfig.reactionroles.messages.find(m => m.id === message.id);
		if (!msgConfig) {
			return;
		}

		const reactionRole = msgConfig.roles.find(r => (emoji.id && r.emojiId === emoji.id) || r.native === emoji.name);
		if (!reactionRole) { return; }
		this.client.removeGuildMemberRole(guild.id, userId, reactionRole.roleId, 'Dyno Reaction Roles').catch(() => null);

		this.dyno.internalEvents.emit('reactionroles', { type: 'remove', guild: guild });
	}
}

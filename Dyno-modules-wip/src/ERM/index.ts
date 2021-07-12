import { Module } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as each from 'async-each';
import * as dyno from 'Dyno';
import * as moment from 'moment-timezone';

/**
 * ERM Module
 * @class ERM
 * @extends Module
 */
export default class ERM extends Module {
	public module      : string   = 'ERM';
	public friendlyName: string   = 'Enhanced Role Mentions';
	public description : string   = 'Mentionable roles for online members.';
	public list        : boolean  = false;
	public enabled     : boolean  = false;
	public hasPartial  : boolean  = false;
	public permissions : string[] =  ['manageRoles'];

	get settings() {
		return {
			cooldown: { type: Number, default: 300 },
			roles: { type: Array },
		};
	}

	public start() {
		this.cooldowns = new Map();
	}

	public async createErm(
		guild: eris.Guild,
		guildConfig: dyno.GuildConfig,
		role: eris.Role,
		mentionChannel: eris.GuildChannel,
		channels: eris.GuildChannel[],
	) {
		if (!this.hasPermissions(guild, 'manageRoles')) {
			return Promise.reject(`I don't have the Manage Roles permission.`);
		}

		guildConfig.erm = guildConfig.erm || {};
		guildConfig.erm.roles = guildConfig.erm.roles || [];

		if (guildConfig.erm.roles.find((r: any) => r.role.id === role.id)) {
			return Promise.reject(`That role is already configured, please remove it or try another.`);
		}

		if (role.mentionable) {
			role.edit({ mentionable: true }).catch(() => null);
		}

		let mentionRole = this.resolveRole(guild, `${role.name}+`);
		if (!mentionRole) {
			const options = {
				name: `${role.name}+`,
				color: role.color,
				mentionable: true,
			};

			try {
				mentionRole = await this.createRole(guild, options);
			} catch (err) {
				this.logger.error(err);
				return Promise.reject(`I wasn't able to create the mentionable role, please check my permissions and try again.`);
			}

			if (!mentionRole) {
				return Promise.reject(`I wasn't able to create the mentionable role, please check my permissions and try again.`);
			}
		}

		const doc = {
			role: { id: role.id, name: role.name },
			mentionRole: { id: mentionRole.id, name: mentionRole.name },
			mentionChannel: { id: mentionChannel.id, name: mentionChannel.name },
			channels: null,
		};

		if (channels) {
			doc.channels = channels.map((c: eris.GuildChannel) => {
				return { id: c.id, name: c.name };
			});
		}

		guildConfig.erm.roles.push(doc);
		return this.dyno.guilds.update(guild.id, { $set: { erm: guildConfig.erm } });
	}

	public deleteErm(guild: eris.Guild, guildConfig: dyno.GuildConfig, role: eris.Role) {
		if (!this.hasPermissions(guild, 'manageRoles')) {
			return Promise.reject(`I don't have the Manage Roles permission.`);
		}

		guildConfig.erm = guildConfig.erm || {};
		guildConfig.erm.roles = guildConfig.erm.roles || [];

		if (!guildConfig.erm.roles.find((r: any) => r.role.id === role.id || r.mentionRole.id === role.id)) {
			return Promise.reject(`That role is not registered.`);
		}

		const index = guildConfig.erm.roles.findIndex((r: any) => r.role.id === role.id || r.mentionRole.id === role.id);
		if (index > -1) {
			guildConfig.erm.roles.splice(index, 1);
		}

		return this.dyno.guilds.update(guild.id, { $set: { erm: guildConfig.erm } });
	}

	public messageCreate({ message, guildConfig }: any) {
		if (!message.channel.guild ||
			!message.member ||
			message.author.bot ||
			!message.roleMentions ||
			!message.roleMentions.length ||
			!guildConfig.erm ||
			!guildConfig.erm.roles ||
			!guildConfig.erm.roles.length) { return; }

		if (!this.isEnabled(message.channel.guild, this, guildConfig)) { return; }

		const ermRole = message.roleMentions.find((id: string) => guildConfig.erm.find((r: any) => r.role.id === id));
		if (!ermRole) { return; }

		const cooldown = this.cooldowns.get(message.author.id);
		const time = guildConfig.cooldown ? guildConfig.cooldown * 1000 : 300000;
		const guild = message.guild;

		if (cooldown && (Date.now() - cooldown) < time) { return; }
		this.cooldowns.set(message.author.id, Date.now());

		const  members = guild.members.filter((m: eris.Member) => m.roles.includes(ermRole.role.id));
		const onlineMembers = members.filter((m: eris.Member) => m.status === 'online');
		const idleMembers = members.filter((m: eris.Member) => m.status !== 'offline');
		const mentionChannel = this.client.getChannel(ermRole.mentionChannel);
		const mentionTemplate = ermRole.mentionTemplate || this.defaults.mentionTemplate;
		const autoResponse = ermRole.autoResponse || this.defaults.autoResponse;

		if (!onlineMembers.length && !idleMembers.length) {
			return this.sendMessage(mentionChannel, this.formatMessage(mentionTemplate, message));
		}

		const mentionMembers = onlineMembers.length ? onlineMembers : idleMembers;
		return this.sendMessage(mentionChannel, this.formatMessage(mentionTemplate, message, mentionMembers)).then(() => {
			if (ermRole.respondEnabled) {
				return this.sendMessage(message.channel, this.formatResponse(autoResponse, message));
			}
		});
	}

	private formatMessage(template: string, message: eris.Message, members?: eris.Member[]): string {
		const mentions = members && members.length ? members.map((m: eris.Member) => `<@!${m.id}> `) : '';
		let content = `${template}\n${mentions}`;

		content = content.replace(/{channel}/g, `<#${message.channel.id}>`);
		return content;
	}

	private formatResponse(autoResponse: string, message: eris.Message): string {
		return `<@!${message.author.id}>, ${autoResponse}`;
	}
}

import {Module} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as dyno from 'Dyno';
import * as moment from 'moment';
import Event from '../Event';

import 'moment-duration-format';

export default class GuildMember extends Event {
	constructor(dynoInstance: dyno.Dyno, module: Module) {
		super(dynoInstance, module);
	}

	public guildMemberAdd({ guild, member, guildConfig }: any) {
		this.shouldLog({ event: 'guildMemberAdd', guild, guildConfig }).then((logChannel: eris.GuildChannel) => {
			if (!logChannel) { return; }

			const embed = {
				color: this.utils.getColor('green'),
				author: {
					name: 'Member Joined',
					icon_url: member.avatarURL,
				},
				description: `${member.mention} ${this.utils.fullName(member)}`,
				thumbnail: null,
				fields: [],
				footer: { text: `ID: ${member.id}` },
				timestamp: (new Date()).toISOString(),
			};

			if (guildConfig.actionlog && guildConfig.actionlog.showThumb) {
				embed.thumbnail = { url: member.avatarURL };
			}

			const newAccountThreshold = guildConfig.newAccThreshold || 2;
			const diff = Date.now() - member.createdAt;

			if (diff < (86400 * newAccountThreshold * 1000)) {
				// cast as any to fix bug in typedef
				const age = (<any>moment.duration(diff / 1000, 'seconds')).format('w [weeks] d [days], h [hrs], m [min], s [sec]');
				embed.fields = [{ name: 'New Account', value: `Created ${age} ago` }];
			}

			this.logEvent(logChannel, embed, guildConfig);
		});
	}

	public guildMemberRemove({ guild, member, guildConfig }: any) {
		this.shouldLog({ event: 'guildMemberRemove', guild, guildConfig }).then((logChannel: eris.GuildChannel) => {
			if (!logChannel) { return; }

			const index = this.module.bans.indexOf(`${guild.id}${member.id}`);
			if (index > -1) {
				this.module.bans.splice(index, 1);
				return;
			}

			const embed = {
				color: this.utils.getColor('orange'),
				author: {
					name: 'Member Left',
					icon_url: member.avatarURL,
				},
				description: `${member.mention} ${this.utils.fullName(member)}`,
				thumbnail: null,
				footer: { text: `ID: ${member.id}` },
				timestamp: (new Date()).toISOString(),
			};

			if (guildConfig.actionlog && guildConfig.actionlog.showThumb) {
				embed.thumbnail = { url: member.avatarURL };
			}

			this.logEvent(logChannel, embed, guildConfig);
		});
	}

	public guildMemberUpdate({ guild, member, oldMember, guildConfig }: any) {
		if (!oldMember) {
			oldMember = Object.assign({}, member, { nick: 'None' });
		}

		if (member.nick !== oldMember.nick) {
			this.nickChange({ guild, member, oldMember, guildConfig });
		}

		if (member.roles !== oldMember.roles) {
			const addedRoles = member.roles.filter((r: string) => !oldMember.roles.includes(r));
			const removedRoles = oldMember.roles.filter((r: string) => !member.roles.includes(r));

			if (addedRoles.length) {
				this.memberRoleAdd({ guild, member, addedRoles, guildConfig });
			}
			if (removedRoles.length) {
				this.memberRoleRemove({ guild, member, removedRoles, guildConfig });
			}
		}
	}

	public nickChange({ guild, member, oldMember, guildConfig }: any) {
		this.shouldLog({ event: 'nickChange', guild, guildConfig }).then((logChannel: eris.GuildChannel) => {
			if (!logChannel) { return; }

			const embed = {
				color: this.utils.getColor('blue'),
				description: `**${member.mention} nickname changed**`,
				author: {
					name: this.utils.fullName(member, false),
					icon_url: member.avatarURL,
				},
				fields: [
					{ name: 'Before', value: oldMember.nick || 'None' },
					{ name: 'After', value: member.nick || 'None' },
				],
				footer: { text: `ID: ${member.id}` },
				timestamp: (new Date()).toISOString(),
			};

			this.logEvent(logChannel, embed, guildConfig);
		});
	}

	public memberRoleAdd({ guild, member, addedRoles, guildConfig }: any) {
		this.shouldLog({ event: 'memberRoleAdd', guild, guildConfig }).then((logChannel: eris.GuildChannel) => {
			if (!logChannel) { return; }

			const roles: eris.Role[] = addedRoles.map((id: string) => guild.roles.get(id));
			if (!roles || !roles.length) { return; }
			let embed: eris.EmbedBase = {};

			if (roles.length === 1) {
				const role = roles[0];
				embed = {
					color: this.utils.getColor('blue'),
					description: `**${member.mention} was given the \`${role.name}\` role**`,
					author: {
						name: this.utils.fullName(member, false),
						icon_url: member.avatarURL,
					},
					footer: { text: `ID: ${member.id}` },
					timestamp: (new Date()).toISOString(),
				};
			} else {
				const roleText = `\`${roles.map((r: eris.Role) => r.name).join('`, `')}\``;
				embed = {
					color: this.utils.getColor('blue'),
					description: `**${member.mention} was given the roles ${roleText}**`,
					author: {
						name: this.utils.fullName(member, false),
						icon_url: member.avatarURL,
					},
					footer: { text: `ID: ${member.id}` },
					timestamp: (new Date()).toISOString(),
				};
			}

			this.logEvent(logChannel, embed, guildConfig);
		});
	}

	public memberRoleRemove({ guild, member, removedRoles, guildConfig }: any) {
		this.shouldLog({ event: 'memberRoleRemove', guild, guildConfig }).then((logChannel: eris.GuildChannel) => {
			if (!logChannel) { return; }

			const roles: eris.Role[] = removedRoles.map((id: string) => guild.roles.get(id));
			if (!roles || !roles.length) { return; }
			let embed: eris.EmbedBase = {};

			if (roles.length === 1) {
				const role = roles[0];
				embed = {
					color: this.utils.getColor('blue'),
					description: `**${member.mention} was removed from the \`${role.name}\` role**`,
					author: {
						name: this.utils.fullName(member, false),
						icon_url: member.avatarURL,
					},
					footer: { text: `ID: ${member.id}` },
					timestamp: (new Date()).toISOString(),
				};
			} else {
				const roleText = `\`${roles.map((r: eris.Role) => r.name).join('`, `')}\``;
				embed = {
					color: this.utils.getColor('blue'),
					description: `**${member.mention} was removed the roles ${roleText}**`,
					author: {
						name: this.utils.fullName(member, false),
						icon_url: member.avatarURL,
					},
					footer: { text: `ID: ${member.id}` },
					timestamp: (new Date()).toISOString(),
				};
			}

			this.logEvent(logChannel, embed, guildConfig);
		});
	}
}

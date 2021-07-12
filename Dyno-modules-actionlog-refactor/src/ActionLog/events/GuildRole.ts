import {Module} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as dyno from 'Dyno';
import Event from '../Event';

export default class GuildRole extends Event {
	private roles: Map<any, any> = new Map();

	constructor(dynoInstance: dyno.Dyno, module: Module) {
		super(dynoInstance, module);
	}

	public guildRoleCreate({ guild, role, guildConfig }: any) {
		this.shouldLog({ event: 'guildRoleCreate', guild, guildConfig }).then((logChannel: eris.GuildChannel) => {
			if (!logChannel) { return; }

			const embed = {
				color: this.utils.getColor('green'),
				description: `**Role Created: ${role.name}**`,
				author: {
					name: guild.name,
					icon_url: guild.iconURL || null,
				},
				footer: { text: `ID: ${role.id}` },
				timestamp: (new Date()).toISOString(),
			};

			if (role.name === 'new role') {
				this.roles.set(role.id, { logChannel, embed });
				return;
			}

			this.logEvent(logChannel, embed, guildConfig);
		});
	}

	public guildRoleDelete({ guild, role, guildConfig }: any) {
		this.shouldLog({ event: 'guildRoleDelete', guild, guildConfig }).then((logChannel: eris.GuildChannel) => {
			if (!logChannel) { return; }

			const embed = {
				color: this.utils.getColor('orange'),
				description: `**Role Deleted: ${role.name || 'unknown'}**`,
				author: {
					name: guild.name,
					icon_url: guild.iconURL || null,
				},
				footer: { text: `ID: ${role.id}` },
				timestamp: (new Date()).toISOString(),
			};

			this.logEvent(logChannel, embed, guildConfig);
		});
	}

	public guildRoleUpdate({ guild, role, oldRole, guildConfig }: any) {
		if (!role || !role.hasOwnProperty('id')) {
			return;
		}

		const createdRole = this.roles.get(role.id);
		if (createdRole) {
			return this.logEvent(createdRole.logChannel, createdRole.embed, guildConfig)
				.then(() => this.roles.delete(role.id));
		}

		this.shouldLog({ event: 'guildRoleUpdate', guild, guildConfig }).then((logChannel: eris.GuildChannel) => {
			if (!logChannel) { return; }

			// temporarily disable until a better fix to prevent multiple name changes per character typed
			// if (role.name !== oldRole.name) {
			// 	this.roleUpdate({ guild, role, oldRole, logChannel, event: 'name' });
			// }

			if (role.color !== oldRole.color) {
				this.roleUpdate({ guild, role, oldRole, logChannel, event: 'color', guildConfig });
			}
		});
	}

	public roleUpdate(e: any) {
		const embed = {
			color: this.utils.getColor('blue'),
			description: `**Role ${this.utils.ucfirst(e.event)} Changed: ${e.oldRole[e.event]} -> ${e.role[e.event]}**`,
			author: {
				name: e.guild.name,
				icon_url: e.guild.iconURL || null,
			},
			footer: { text: `ID: ${e.role.id}` },
			timestamp: (new Date()).toISOString(),
		};

		return this.logEvent(e.logChannel, embed, e.guildConfig);
	}
}

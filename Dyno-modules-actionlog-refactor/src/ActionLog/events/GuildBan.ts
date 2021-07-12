import {Module} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as dyno from 'Dyno';
import Event from '../Event';

export default class GuildBan extends Event {
	constructor(dynoInstance: dyno.Dyno, module: Module) {
		super(dynoInstance, module);
	}

	public guildBanAdd({ guild, member, guildConfig }: any) {
		this.shouldLog({ event: 'guildBanAdd', guild, guildConfig }).then((logChannel: eris.GuildChannel) => {
			if (!logChannel) { return; }

			const embed = {
				color: this.utils.getColor('orange'),
				author: {
					name: 'Member Banned',
					icon_url: member.avatarURL,
				},
				thumbnail: { url: member.avatarURL },
				description: `${member.mention} ${this.utils.fullName(member)}`,
				footer: { text: `ID: ${member.id}` },
				timestamp: (new Date()).toISOString(),
			};

			this.module.bans.push(`${guild.id}${member.id}`);

			this.logEvent(logChannel, embed, guildConfig);
		});
	}

	public guildBanRemove({ guild, member, guildConfig }: any) {
		this.shouldLog({ event: 'guildBanRemove', guild, guildConfig }).then((logChannel: eris.GuildChannel) => {
			if (!logChannel) { return; }

			const embed = {
				color: this.utils.getColor('blue'),
				author: {
					name: 'Member Unbanned',
					icon_url: member.avatarURL,
				},
				thumbnail: { url: member.avatarURL },
				description: `${member.mention} ${this.utils.fullName(member)}`,
				footer: { text: `ID: ${member.id}` },
				timestamp: (new Date()).toISOString(),
			};

			this.logEvent(logChannel, embed, guildConfig);
		});
	}
}

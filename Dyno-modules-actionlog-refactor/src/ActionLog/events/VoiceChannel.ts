import {Module} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as dyno from 'Dyno';
import Event from '../Event';

export default class VoiceChannel extends Event {
	constructor(dynoInstance: dyno.Dyno, module: Module) {
		super(dynoInstance, module);
	}

	public voiceChannelJoin({ guild, member, channel, guildConfig }: any) {
		this.shouldLog({ event: 'voiceChannelJoin', guild, guildConfig }).then((logChannel: eris.GuildChannel) => {
			if (!logChannel) { return; }

			const embed = {
				color: this.utils.getColor('green'),
				description: `**${member.mention} joined voice channel ${channel.mention || channel.name}**`,
				author: {
					name: this.utils.fullName(member, false),
					icon_url: member.avatarURL || null,
				},
				footer: { text: `ID: ${member.id}` },
				timestamp: (new Date()).toISOString(),
			};

			this.logEvent(logChannel, embed, guildConfig);
		});
	}

	public voiceChannelLeave({ guild, member, channel, guildConfig }: any) {
		this.shouldLog({ event: 'voiceChannelLeave', guild, guildConfig }).then((logChannel: eris.GuildChannel) => {
			if (!logChannel) { return; }

			const embed = {
				color: this.utils.getColor('green'),
				description: `**${member.mention} left voice channel ${channel.mention || channel.name}**`,
				author: {
					name: this.utils.fullName(member, false),
					icon_url: member.avatarURL || null,
				},
				footer: { text: `ID: ${member.id}` },
				timestamp: (new Date()).toISOString(),
			};

			this.logEvent(logChannel, embed, guildConfig);
		});
	}

	public voiceChannelSwitch({ guild, member, channel, oldChannel, guildConfig }: any) {
		this.shouldLog({ event: 'voiceChannelSwitch', guild, guildConfig }).then((logChannel: eris.GuildChannel) => {
			if (!logChannel) { return; }

			const embed = {
				color: this.utils.getColor('green'),
				description: `**${member.mention} switched voice channel \`#${oldChannel.name}\` -> \`#${channel.name}\`**`,
				author: {
					name: this.utils.fullName(member, false),
					icon_url: member.avatarURL || null,
				},
				footer: { text: `ID: ${member.id}` },
				timestamp: (new Date()).toISOString(),
			};

			this.logEvent(logChannel, embed, guildConfig);
		});
	}
}

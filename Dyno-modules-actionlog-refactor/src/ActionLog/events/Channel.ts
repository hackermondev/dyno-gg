import {Module} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as dyno from 'Dyno';
import Event from '../Event';

export default class Channel extends Event {
	constructor(dynoInstance: dyno.Dyno, module: Module) {
		super(dynoInstance, module);
	}

	public channelCreate({ channel, guildConfig }: any) {
		if ((channel.type !== 0 && channel.type !== 2) || !channel.guild) {
			return;
		}

		const guild = channel.guild;

		this.shouldLog({ event: 'channelCreate', guild, guildConfig }).then((logChannel: eris.GuildChannel) => {
			if (!logChannel) { return; }

			const embed = {
				color: this.utils.getColor('green'),
				description: `**Channel Created: #${channel.name}**`,
				author: {
					name: guild.name,
					icon_url: guild.iconURL || null,
				},
				footer: { text: `ID: ${channel.id}` },
				timestamp: (new Date()).toISOString(),
			};

			this.logEvent(logChannel, embed, guildConfig);
		});
	}

	public channelDelete({ channel, guildConfig }: any) {
		if ((channel.type !== 0 && channel.type !== 2) || !channel.guild) {
			return;
		}

		const guild = channel.guild;

		this.shouldLog({ event: 'channelDelete', guild, guildConfig }).then((logChannel: eris.GuildChannel) => {
			if (!logChannel) { return; }

			const embed = {
				color: this.utils.getColor('orange'),
				description: `**Channel Deleted: #${channel.name}**`,
				author: {
					name: guild.name,
					icon_url: guild.iconURL || null,
				},
				footer: { text: `ID: ${channel.id}` },
				timestamp: (new Date()).toISOString(),
			};

			this.logEvent(logChannel, embed, guildConfig);
		});
	}
}

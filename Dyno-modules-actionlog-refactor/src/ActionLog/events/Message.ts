import {Module} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as dyno from 'Dyno';
import Event from '../Event';

export default class Message extends Event {
	constructor(dynoInstance: dyno.Dyno, module: Module) {
		super(dynoInstance, module);
	}

	public messageUpdate({ message, oldMessage, guildConfig }: any) {
		if (!message || !oldMessage || !message.author || message.author.bot) { return; }
		if (message.content === oldMessage.content) { return; }

		this.shouldLog({ event: 'messageEdit', guild: message.guild, channel: message.channel, guildConfig })
			.then((logChannel: eris.GuildChannel) => {
				if (!logChannel) { return; }

				const embed = {
					color: this.utils.getColor('blue'),
					author: {
						name: this.utils.fullName(message.author, false),
						icon_url: message.author.avatarURL,
					},
					description: `**Message edited in ${message.channel.mention || '#deleted-channel'}**`,
					fields: [
						{ name: 'Before', value: oldMessage.content.length > 255 ?
							`${oldMessage.content.substr(0, 252)}...` : `${oldMessage.content}` },
						{ name: 'After', value: message.cleanContent.length > 255 ?
							`${message.cleanContent.substr(0, 252)}...` : `${message.cleanContent}` },
					],
					footer: { text: `User ID: ${message.author.id}` },
					timestamp: (new Date()).toISOString(),
				};

				this.logEvent(logChannel, embed, guildConfig);
			});
	}

	/**
	 * Handle message delete
	 * @param {Message} message Message object
	 * @returns {*}
	 */
	public messageDelete({ message, guildConfig }: any) {
		let guild = null;
		let channel = null;

		if (!message.channel.guild) {
			if (message.channelID) {
				channel = this.client.getChannel(message.channelID);
				guild = channel.guild;
				// guild = this.client.guilds.get(this.client.channelGuildMap[message.channelID]);
			} else { return; }
		} else {
			guild = this.client.guilds.get(message.channel.guild.id);
		}

		channel = channel || message.channel;

		if (message.author && message.author.bot) {
			return;
		}

		this.shouldLog({ event: 'messageDelete', guild, channel: channel, guildConfig }).then(async (logChannel: eris.GuildChannel) => {
			if (!logChannel) { return; }

			if (!channel) {
				channel = message.channel || {};
			}

			const author = message && message.author ? ` sent by ${message.author.mention}` : '';
			const embed = {
				color: this.utils.getColor('orange'),
				description: `**Message${author} deleted in ${channel.mention || '#deleted-channel'}**`,
				author: {
					name: message.author ? this.utils.fullName(message.author, false) : guild.name,
					icon_url: message.author ? message.author.avatarURL || null : guild.iconURL,
				},
				footer: { text: `ID: ${message.author ? message.author.id : channel.id}` },
				timestamp: (new Date()).toISOString(),
			};

			if (message.cleanContent) {
				embed.description += '\n';
				embed.description += message.cleanContent.length > 255 ?
					`${message.cleanContent.substr(0, 252)}...` :
					message.cleanContent;
			}

			this.logEvent(logChannel, embed, guildConfig);
		});
	}

	public messageDeleteBulk({ channel, guild, messages, guildConfig }: any) {
		if ((channel.type !== 0 && channel.type !== 2) || !channel.guild) {
			return;
		}

		this.shouldLog({ event: 'messageDeleteBulk', guild, channel, guildConfig }).then(async (logChannel: eris.GuildChannel) => {
			if (!logChannel) { return; }

			const embed = {
				color: this.utils.getColor('blue'),
				description: `**Bulk Delete in ${channel.mention}, ${messages.length} messages deleted**`,
				author: {
					name: guild.name,
					icon_url: guild.iconURL || null,
				},
				timestamp: (new Date()).toISOString(),
			};

			this.logEvent(logChannel, embed, guildConfig);
		});
	}

}

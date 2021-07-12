import {Module, Purger} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as each from 'async-each';
import * as dyno from 'Dyno';
import * as moment from 'moment';

/**
 * VoiceTextLinking Module
 * @class VoiceTextLinking
 * @extends Module
 */
export default class VoiceTextLinking extends Module {
	public module: string = 'VoiceTextLinking';
	public friendlyName: string = 'Voice Text Linking';
	public description: string = 'Open a text channel when a user joins a voice channel.';
	public list: boolean = true;
	public enabled: boolean = false;
	public hasPartial: boolean = true;

	public permissions: string[] = ['manageChannels'];

	public purger: Purger;

	get settings() {
		return {
			purgeChannel: { type: Boolean, default: false },
			announceMember: { type: Boolean, default: false },
			mentionMember: { type: Boolean, default: false },
			joinMessage: { type: String, default: `{user} has joined the channel.` },
			leaveMessage: { type: String, default: `{user} has left the channel.` },
			channels: { type: Array, default: [] },
		};
	}

	public start() {
		this.purger = new Purger(this.config, this.dyno);
	}

	public getTextChannel(channel: eris.TextChannel, guildConfig: any) {
		const voiceConfig = guildConfig.voicetextlinking;

		if (!voiceConfig.channels) {
			return;
		}

		const channels = voiceConfig.channels.find((o: any) => o.voiceChannel === channel.id);
		if (channels && channels.textChannel) {
			return channel.guild.channels.find((c: eris.GuildChannel) => c.type === 0 && c.id === channels.textChannel);
		}
	}

	public memberJoin(channel: eris.VoiceChannel, textChannel: eris.AnyGuildChannel, member: eris.Member, guildConfig: dyno.GuildConfig) {
		const voiceConfig = guildConfig.voicetextlinking;
		if (!voiceConfig) { return; }
		if (voiceConfig.announceMember) {
			let message = voiceConfig.joinMessage || `{user} has joined the channel.`;
			message = message.replace(/{user}/gi, member.mention);
			this.sendMessage(textChannel, message);
		}
	}

	public memberLeave(channel: eris.VoiceChannel, textChannel: eris.AnyGuildChannel, member: eris.Member, guildConfig: dyno.GuildConfig) {
		const voiceConfig = guildConfig.voicetextlinking;
		if (!voiceConfig) { return; }
		if (voiceConfig.announceMember) {
			let message = voiceConfig.leaveMessage || `{user} has left the channel.`;
			message = message.replace(/{user}/gi, member.mention);
			this.sendMessage(textChannel, message);
		}

		if (voiceConfig.purgeChannel) {
			if (channel.voiceMembers.size === 0) {
				this.purger.purge(<eris.TextChannel>textChannel, 5000).catch(() => null);
			}
		}
	}

	public voiceChannelJoin({ guild, member, channel, guildConfig }: any) {
		if (!this.isEnabled(guild, this.module, guildConfig)) { return; }
		const textChannel = this.getTextChannel(channel, guildConfig);
		if (textChannel) {
			textChannel.editPermission(member.id, 68608, null, 'member')
				.then(() => this.memberJoin(channel, textChannel, member, guildConfig))
				.catch(() => false);
		}
	}

	public voiceChannelLeave({ guild, member, channel, guildConfig }: any) {
		if (!this.isEnabled(guild, this.module, guildConfig)) { return; }
		const textChannel = this.getTextChannel(channel, guildConfig);
		if (textChannel) {
			textChannel.deletePermission(member.id)
				.then(() => this.memberLeave(channel, textChannel, member, guildConfig))
				.catch(() => false);
		}
	}

	public voiceChannelSwitch({ guild, member, channel, oldChannel, guildConfig }: any) {
		if (!this.isEnabled(guild, this.module, guildConfig)) { return; }
		const textChannel = this.getTextChannel(channel, guildConfig);
		const oldTextChannel = this.getTextChannel(oldChannel, guildConfig);

		// do nothing if the same text channel is bound to both voice channels.
		if (oldTextChannel === textChannel) {
			return;
		}

		if (oldTextChannel) {
			oldTextChannel.deletePermission(member.id)
				.then(() => this.memberLeave(oldChannel, oldTextChannel, member, guildConfig))
				.catch(() => false);
		}
		if (textChannel) {
			textChannel.editPermission(member.id, 68608, null, 'member')
				.then(() => this.memberJoin(channel, textChannel, member, guildConfig))
				.catch(() => false);
		}
	}
}

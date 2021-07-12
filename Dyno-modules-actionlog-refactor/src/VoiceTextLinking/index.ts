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

	get settings() {
		return {
			purgeChannel: { type: Boolean, default: false },
			announceMember: { type: Boolean, default: false },
			mentionMember: { type: Boolean, default: false },
			joinMessage: { type: String, default: `{user} has joined the channel.` },
			leaveMessage: { type: String, default: `{user} has left the channel.` },
		};
	}

	public start() {
		this.purger = new Purger(this.config, this.dyno);
	}

	public getTextChannel(channel: eris.TextChannel) {
		const name = channel.name.toLowerCase().replace(/[^a-z0-9\-_+]+/gi, '');
		return channel.guild.channels.find((c: eris.GuildChannel) => c.type === 0 && c.name.startsWith('voice-') && c.name.endsWith(name));
	}

	public memberJoin(channel: eris.VoiceChannel, textChannel: eris.GuildChannel, member: eris.Member, guildConfig: dyno.GuildConfig) {
		if (!guildConfig.voicetextlinking) { return; }
		if (guildConfig.voicetextlinking.announceMember) {
			let message = guildConfig.voicetextlinking.joinMessage || `{user} has joined the channel.`;
			message = message.replace(/{user}/gi, member.mention);
			this.sendMessage(textChannel, message);
		}
	}

	public memberLeave(channel: eris.VoiceChannel, textChannel: eris.GuildChannel, member: eris.Member, guildConfig: dyno.GuildConfig) {
		if (!guildConfig.voicetextlinking) { return; }
		if (guildConfig.voicetextlinking.announceMember) {
			let message = guildConfig.voicetextlinking.leaveMessage || `{user} has left the channel.`;
			message = message.replace(/{user}/gi, member.mention);
			this.sendMessage(textChannel, message);
		}

		if (guildConfig.voicetextlinking.purgeChannel) {
			if (channel.voiceMembers.size === 0) {
				this.purger.purge(textChannel, 5000).catch(() => null);
			}
		}
	}

	public voiceChannelJoin({ guild, member, channel, guildConfig }: any) {
		if (!this.isEnabled(guild, this.module, guildConfig)) { return; }
		const textChannel = this.getTextChannel(channel);
		if (textChannel) {
			textChannel.editPermission(member.id, 68608, null, 'member')
				.then(() => this.memberJoin(channel, textChannel, member, guildConfig))
				.catch(() => false);
		}
	}

	public voiceChannelLeave({ guild, member, channel, guildConfig }: any) {
		if (!this.isEnabled(guild, this.module, guildConfig)) { return; }
		const textChannel = this.getTextChannel(channel);
		if (textChannel) {
			textChannel.deletePermission(member.id)
				.then(() => this.memberLeave(channel, textChannel, member, guildConfig))
				.catch(() => false);
		}
	}

	public voiceChannelSwitch({ guild, member, channel, oldChannel, guildConfig }: any) {
		if (!this.isEnabled(guild, this.module, guildConfig)) { return; }
		const textChannel = this.getTextChannel(channel);
		const oldTextChannel = this.getTextChannel(oldChannel);
		if (textChannel) {
			textChannel.editPermission(member.id, 68608, null, 'member')
				.then(() => this.memberJoin(channel, textChannel, member, guildConfig))
				.catch(() => false);
		}
		if (oldTextChannel) {
			oldTextChannel.deletePermission(member.id)
				.then(() => this.memberLeave(oldChannel, oldTextChannel, member, guildConfig))
				.catch(() => false);
		}
	}
}

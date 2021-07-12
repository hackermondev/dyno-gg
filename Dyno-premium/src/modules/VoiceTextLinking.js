'use strict';

const Module = Loader.require('./core/structures/Module');
const Purger = Loader.require('./helpers/Purger');
const utils = Loader.require('./core/utils');

/**
 * VoiceTextLinking Module
 * @class VoiceTextLinking
 * @extends Module
 */
class VoiceTextLinking extends Module {
	constructor() {
		super();

		this.module = 'VoiceTextLinking';
		this.friendlyName = 'Voice Text Linking';
		this.description = 'Open a text channel when a user joins a voice channel.';
		this.enabled = false;
		this.hasPartial = true;

		this.permissions = [
			'manageChannels',
		];
	}

	static get name() {
		return 'VoiceTextLinking';
	}

	get settings() {
		return {
			purgeChannel: { type: Boolean, default: false },
			announceMember: { type: Boolean, default: false },
			joinMessage: { type: String, default: `{user} has joined the channel.` },
			leaveMessage: { type: String, default: `{user} has left the channel.` },
		};
	}

	start() {
		this.purger = new Purger(this.config, this.dyno);
	}

	getTextChannel(channel) {
		let name = channel.name.toLowerCase().replace(/[^a-z0-9\-_+]+/gi, '');
		let textChannel = channel.guild.channels.find(c => c.type === 0 && c.name.startsWith('voice-') && c.name.endsWith(name));
		return textChannel;
	}

	memberJoin(channel, textChannel, member, guildConfig) {
		if (!guildConfig.voicetextlinking) return;
		if (guildConfig.voicetextlinking.announceMember) {
			let message = guildConfig.voicetextlinking.joinMessage || `{user} has joined the channel.`;
			message = message.replace(/{user}/gi, member.mention);
			this.sendMessage(textChannel, message);
		}
	}

	memberLeave(channel, textChannel, member, guildConfig) {
		if (!guildConfig.voicetextlinking) return;
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

	voiceChannelJoin({ guild, member, channel, guildConfig }) {
		if (!this.isEnabled(guild, this.module, guildConfig)) return;
		let textChannel = this.getTextChannel(channel);
		if (textChannel) {
			textChannel.editPermission(member.id, 68608, null, 'member')
				.then(() => this.memberJoin(channel, textChannel, member, guildConfig))
				.catch(() => false);
		}
	}

	voiceChannelLeave({ guild, member, channel, guildConfig }) {
		if (!this.isEnabled(guild, this.module, guildConfig)) return;
		let textChannel = this.getTextChannel(channel);
		if (textChannel) {
			textChannel.deletePermission(member.id)
				.then(() => this.memberLeave(channel, textChannel, member, guildConfig))
				.catch(() => false);
		}
	}

	voiceChannelSwitch({ guild, member, channel, oldChannel, guildConfig }) {
		if (!this.isEnabled(guild, this.module, guildConfig)) return;
		let textChannel = this.getTextChannel(channel);
		let oldTextChannel = this.getTextChannel(oldChannel);
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

module.exports = VoiceTextLinking;

import { Module } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as dyno from 'Dyno';

/**
 * Welcome Module
 * @class Welcome
 * @extends Module
 */
export default class Welcome extends Module {
	public module         : string  = 'Welcome';
	public description    : string  = 'Create welcome messages with various options.';
	public list           : boolean = true;
	public enabled        : boolean = false;
	public hasPartial     : boolean = true;
	public defaultEnabled : boolean = false;

	get settings() {
		return {
			channel:        String,
			sendDM:         Boolean,
			message:        String,
			embed:          Object,
			type:           { type: String },
		};
	}

	public start() {}

	public diagnose({ guildConfig, diagnosis, remote }: any) {
		if (!guildConfig.announcements) {
			return diagnosis;
		}

		if (guildConfig.welcome.sendDM) {
			diagnosis.info.push(`Welcome messages will be sent in DM to new members`);
		}

		if (guildConfig.welcome.channel && guildConfig.welcome.channel !== 'Select Channel') {
			const channel = this.client.getChannel(guildConfig.welcome.channel);
			if (!channel && !remote) {
				diagnosis.issues.push(`I can't find the welcome channel. It is hidden from me or deleted.`);
			} else {
				diagnosis.info.push(`The welcome channel is ${channel.mention}.`);
			}
		}

		return diagnosis;
	}

	/**
	 * onJoin event handler
	 * @param {Guild} guild Guild object
	 * @param {Member} member User object
	 * @returns {Promise}
	 */
	/* tslint:disable-next-line:cyclomatic-complexity */
	public guildMemberAdd({ guild, member, guildConfig }: any) {
		if (!guildConfig || !guildConfig.welcome || !member.id) { return; }
		if (!this.isEnabled(guild, this.module, guildConfig)) { return; }

		let { channel, sendDM, message, embed, type } = guildConfig.welcome;

		if (!member || member.bot) {
			return;
		}

		channel = guild.channels.find((c: eris.GuildChannel) => c.id === channel) || guild.defaultChannel;
		if (!channel && !sendDM) { return; }

		const sendOpts : any = {};
		const data = { guild: guild, user: member, channel: channel };

		let finalMessage;

		if (!type || type === 'MESSAGE') {
			if (!message) {
				return;
			}

			if (message.includes('{everyone}') || message.includes('{here}')) {
				sendOpts.disableEveryone = false;
			}

			finalMessage = this.utils.replacer(message, data);
		} else if (type === 'EMBED') {
			if (!embed) {
				return;
			}

			if (embed.description) {
				embed.description = this.utils.replacer(embed.description, data);
			}

			if (embed.title) {
				embed.title = this.utils.replacer(embed.title, data);
			}

			if (embed.fields && embed.fields.length) {
				embed.fields = embed.fields.map(field => {
					field.name = this.utils.replacer(field.name, data);
					field.value = this.utils.replacer(field.value, data);
					return field;
				});
			}

			if (embed.footer && embed.footer.text) {
				embed.footer.text = this.utils.replacer(embed.footer.text, data);
			}

			finalMessage = { embed };
		}

		if (!sendDM) {
			return this.sendMessage(channel, finalMessage, sendOpts);
		}

		return this.client.getDMChannel(member.id)
			.then((dmChannel: eris.PrivateChannel) => this.sendMessage(dmChannel, finalMessage).catch((err: string) => this.logger.error(err)))
			.catch((err: string) => this.logger.error(err, {
				type: 'welcome.guildMemberAdd.getDMChannel',
				guild: guild.id,
				shard: guild.shard.id,
			}));
	}
}

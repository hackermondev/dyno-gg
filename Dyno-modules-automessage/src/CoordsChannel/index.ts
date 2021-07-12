import {Module} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as dyno from 'Dyno';

/**
 * CoordsChannel Module
 * @class CoordsChannel
 * @extends Module
 */
export default class CoordsChannel extends Module {
	public module      : string  = 'CoordsChannel';
	public friendlyName: string  = 'Coords Channel Mod';
	public description : string  = 'Auto delete non-coords messages in coords channels.';
	public list        : boolean = true;
	public enabled     : boolean = false;
	public hasPartial  : boolean = true;

	get settings() {
		return {
			channels: { type: Array, default: [] },
			logChannel: { type: String },
		};
	}

	public start() {
		this._floatRegex = new RegExp('[+-]?([0-9]*[.])[0-9]+', 'g');
	}

	/**
	 * Log deleted message or ban
	 */
	public log(message: eris.Message, msgContent: string, reason: string, guildConfig: dyno.GuildConfig) {
		if (!guildConfig || !guildConfig.coordschannel.logChannel) { return; }

		const logChannel = this.client.getChannel(guildConfig.coordschannel.logChannel);
		if (!logChannel) { return; }

		let text = `Deleted message from ${this.utils.fullName(message.author)} in ${(<eris.GuildChannel>message.channel).mention} for ${reason}`;
		if (msgContent.length) {
			text += `\n${'```'}msgContent${'```'}`;
		}

		this.sendMessage(logChannel, text);
	}

	/**
	 * Handle new message
	 */
	public messageCreate({ message, guildConfig }: any) {
		if (message.author.bot || !message.member) { return; }
		if (message.isPrivate) { return; }

		// const guildConfig = await this.dyno.guilds.getOrFetch(message.channel.guild.id);
		if (!guildConfig) { return; }

		if (!this.isEnabled(message.channel.guild, this, guildConfig)) { return; }
		if (!this.hasPermissions(message.channel.guild, 'manageMessages')) { return; }

		const coordsConfig = guildConfig.coordschannel;

		if (!guildConfig || !coordsConfig || !coordsConfig.channels || !coordsConfig.channels.length) {
			return;
		}

		if (!coordsConfig.channels.find(c => c.id === message.channel.id)) { return; }

		const floatMatch = message.content.match(this._floatRegex);

		if (!floatMatch || !floatMatch.length) {
			message.delete()
				.then(() => this.log(message, message.content, 'talking in coords channel', guildConfig))
				.catch((err: string) => {});
		}
	}
}

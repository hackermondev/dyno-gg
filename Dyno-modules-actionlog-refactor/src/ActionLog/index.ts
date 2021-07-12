import {Module} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as each from 'async-each';
import * as dyno from 'Dyno';
import * as moment from 'moment';
import * as commands from './commands';

require('moment-duration-format');

/**
 * Action Log module
 * @extends Module
 */
export default class ActionLog extends Module {
	public module      : string   = 'ActionLog';
	public friendlyName: string   = 'Action Log';
	public description : string   = 'Customizable log of events that happen in the server.';
	public list        : boolean  = true;
	public enabled     : boolean  = false;
	public hasPartial  : boolean  = true;
	public permissions : string[] = ['manageWebhooks'];
	public commands    : {}       = commands;

	public bans: any[] = [];

	get settings() {
		return {
			channel:            { type: String },
			guildMemberAdd:     { type: Boolean },
			guildMemberRemove:  { type: Boolean },
			guildBanAdd:        { type: Boolean },
			guildBanRemove:     { type: Boolean },
			messageEdit:        { type: Boolean },
			messageDelete:      { type: Boolean },
			messageDeleteBulk:  { type: Boolean },
			channelCreate:      { type: Boolean },
			channelDelete:      { type: Boolean },
			guildRoleCreate:    { type: Boolean },
			guildRoleDelete:    { type: Boolean },
			guildRoleUpdate:    { type: Boolean },
			memberRoleAdd:      { type: Boolean },
			memberRoleRemove:   { type: Boolean },
			invites: 			{ type: Boolean },
			commands:           { type: Boolean },
			nickChange:         { type: Boolean },
			userChange:         { type: Boolean },
			voiceChannelJoin:   { type: Boolean },
			voiceChannelLeave:  { type: Boolean },
			voiceChannelSwitch: { type: Boolean },
			ignoredChannels:    { type: Array, default: [] },
			showThumb:          { type: Boolean },
		};
	}

	public start() {
		this.commandListener = this.onCommand.bind(this);

		this.dyno.commands.on('command', this.commandListener);

		this.schedule('*/5 * * * *', this.clearBans.bind(this));
		this.schedule('*/1 * * * *', this.cleanup.bind(this));
		this.schedule('*/30 * * * *', () => {
			if (this._userGuildCache) {
				delete this._userGuildCache;
			}
		});
	}

	public unload() {
		this.dyno.commands.removeListener('command', this.commandListener);
	}

	/**
	 * Handle command received
	 */
	public onCommand({ command, message, guildConfig }: any) {
		this.shouldLog({ event: 'commands', guild: message.channel.guild, channel: message.channel, guildConfig })
			.then(async (logChannel: eris.GuildChannel) => {
				if (!logChannel) { return; }

				if (['Manager', 'Moderator'].includes(command.group || command.module)) {
					const description = `Used \`${command.name}\` command in ${message.channel.mention}\n${message.cleanContent}`;

					const embed = {
						color: this.utils.getColor('blue'),
						description: description,
						author: {
							name: this.utils.fullName(message.author, false),
							icon_url: message.author.avatarURL,
						},
						timestamp: (new Date()).toISOString(),
					};

					this.logEvent(logChannel, embed, guildConfig);
				}
			});
	}

	private clearBans() {
		this.bans = [];
	}

	private cleanup() {
		this.invites = new Set();
	}
}

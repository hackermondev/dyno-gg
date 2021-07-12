import {Module} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as dyno from 'Dyno';
import Event from '../Event';

export default class Invites extends Event {
	private invites: Set<string> = new Set();
	private inviteRegex: RegExp = new RegExp('(discordapp.com/invite|discord.me|discord.gg)(?:/#)?(?:/invite)?/([a-zA-Z0-9\-]+)');

	constructor(dynoInstance: dyno.Dyno, module: Module) {
		super(dynoInstance, module);
	}

	public messageCreate({ message, guildConfig }: any) {
		this.shouldLog({ event: 'invites', guild: message.channel.guild, channel: message.channel, guildConfig })
		.then(async (logChannel: eris.GuildChannel) => {
			if (!logChannel) { return; }
			const match = message.content.match(this.inviteRegex);
			if (!match) { return; }

			const code = match.pop();
			const key = `${message.channel.id}.${message.author.id}.${code}`;

			if (this.invites.has(key)) { return; }
			this.invites.add(key);

			let invite;
			try {
				invite = await this.client.getInvite(code, true);
			} catch (err) {
				return;
			}

			if (!invite) { return; }

			const link = match[0].startsWith('http') ? match[0] : `https://${match[0]}`;

			const embed = {
				color: this.utils.getColor('blue'),
				author: {
					name: this.utils.fullName(message.author),
					icon_url: message.author.avatarURL,
				},
				description: `**Invite posted for ${invite.guild.name} ${message.channel.mention}**\n${link}`,
				fields: [],
				footer: { text: `ID: ${invite.guild.id}` },
			};

			if (invite.inviter) {
				embed.fields.push({ name: 'Inviter', value: this.utils.fullName(invite.inviter), inline: true });
			}

			if (invite.channel) {
				embed.fields.push({ name: 'Channel', value: `#${invite.channel.name}`, inline: true });
			}

			if (invite.memberCount) {
				if (invite.presenceCount) {
					embed.fields.push({ name: 'Members', value: `${invite.presenceCount}/${invite.memberCount}`, inline: true });
				} else {
					embed.fields.push({ name: 'Members', value: `${invite.memberCount}`, inline: true });
				}
			}

			if (message.guild.id === this.config.dynoGuild) {
				let inviteGuild;
				try {
					inviteGuild = await this.models.Server.findOne({ _id: invite.guild.id }, { deleted: 1, ownerID: 1 }).lean().exec();
				} catch (err) {
					// pass
				}

				if (inviteGuild) {
					embed.fields.push({ name: 'Dyno', value: inviteGuild.deleted === true ? 'Kicked' : 'In Server', inline: true });

					let owner;
					if (inviteGuild.ownerID) {
						owner = this.client.users.get(inviteGuild.ownerID);
						if (!owner) {
							owner = await this.restClient.getRESTUser(inviteGuild.ownerID);
						}

						if (owner) {
							embed.fields.push({ name: 'Owner', value: this.utils.fullName(owner), inline: true });
						}
					}
				} else {
					embed.fields.push({ name: 'Dyno', value: 'Never Added', inline: true });
				}
			}

			this.logEvent(logChannel, embed, guildConfig);
		});
	}
}

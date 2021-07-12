import { Command, CommandData, SubCommand } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

interface IAnnounceData extends CommandData {
	mention: string;
}

export default class Announce extends Command {
	public aliases     : string[] = ['announce'];
	public group       : string   = 'Manager';
	public module      : string   = 'Announcements';
	public description : string   = 'Send an announcement using the bot.';
	public defaultCommand: string = 'announce';
	public defaultUsage: string   = 'announce [channel] [message]';
	public permissions : string   = 'serverAdmin';
	public cooldown    : number   = 5000;
	public expectedArgs: number   = 2;

	public commands: SubCommand[] = [
		{ name: 'announce', desc: 'Send an announcement using the bot.', default: true, usage: 'announce [channel] [message]' },
		{ name: 'everyone', desc: 'Send an announcement with @everyone.', usage: 'everyone [channel] [message]' },
		{ name: 'here', desc: 'Send an announcement with @here.', usage: 'here [channel] [message]' },
		{ name: 'role', desc: 'Send an announcement with a role mention.', usage: 'role [role] [channel] [message]' },
	];

	public usage: string[] = [
		'announce [channel] [message]',
		'announce everyone [channel] [message]',
		'announce here [channel] [message]',
		'announce role [role] [channel] [message]',
	];

	public example: string[] = [
		'announce #updates Some nice announcement!',
		'announce everyone #updates A big announcement! :tada:',
		'announce here #updates A somewhat big announcement!',
		'announce role @Updates #announcements Some new stuff happened!',
	];

	public execute() {
		return Promise.resolve();
	}

	public async announce({ message, args, guildConfig, mention }: IAnnounceData) {
		const channel = this.resolveChannel((<eris.GuildChannel>message.channel).guild, args[0]);

		if (!channel) {
			return this.error(message.channel, 'You must specify a channel.');
		}

		const embed: any = {
			description: args.slice(1).join(' '),
			timestamp: (new Date()).toISOString(),
		};

		if (mention && ['everyone', 'here'].includes(mention)) {
			mention = `@${mention}`;
		}

		let payload: eris.WebhookPayload | eris.MessageContent;

		if (this.config.isPremium) {
			payload = {
				disableEveryone: false,
				embeds: [embed],
			};
			if (mention) {
				payload.content = mention;
			}

			try {
				await this.sendWebhook(<eris.TextChannel>channel, payload, guildConfig);
				return Promise.resolve();
			} catch (err) {
				payload = { embed };
				if (mention) {
					payload.content = mention;
				}

				this.sendMessage(channel, payload, { disableEveryone: false });
				return Promise.resolve();
			}
		}

		payload = { embed };
		if (mention) {
			payload.content = mention;
		}

		return this.sendMessage(channel, payload, { disableEveryone: false });
	}

	public everyone({ message, args, guildConfig }: CommandData) {
		return this.announce({ message, args, guildConfig, mention: 'everyone' });
	}

	public here({ message, args, guildConfig }: CommandData) {
		return this.announce({ message, args, guildConfig, mention: 'here' });
	}

	public role({ message, args, guildConfig }: CommandData) {
		const role = this.resolveRole((<eris.GuildChannel>message.channel).guild, args[0]);
		if (!role) {
			return this.error(message.channel, `I can't find that role.`);
		}

		return this.announce({ message, args: args.slice(1), guildConfig, mention: role.mention });
	}
}

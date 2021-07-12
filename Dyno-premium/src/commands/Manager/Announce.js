'use strict';

const Command = Loader.require('./core/structures/Command');

class Announce extends Command {
	constructor(...args) {
		super(...args);

		this.aliases = ['announce'];
		this.group = 'Manager';
		this.module = 'Announcements';
		this.description = 'Send an announcement using the bot.';
		this.permissions = 'serverAdmin';
		this.expectedArgs = 2;
		this.cooldown = 5000;
		this.defaultCommand = 'announce';
		this.defaultUsage = 'announce [channel] [message]';

		this.commands = [
			{ name: 'announce', desc: 'Send an announcement using the bot.', default: true, usage: 'announce [channel] [message]' },
			{ name: 'everyone', desc: 'Send an announcement with @everyone.', usage: 'everyone [channel] [message]' },
			{ name: 'here', desc: 'Send an announcement with @here.', usage: 'here [channel] [message]' },
			{ name: 'role', desc: 'Send an announcement with a role mention.', usage: 'role [role] [channel] [message]' },
		];
		
		this.usage = [
			'announce #updates Some nice announcement!',
			'announce everyone #updates A big announcement! :tada:',
		];
	}

	execute() {
		return Promise.resolve();
	}

	async announce(message, args, guildConfig, mention) {
		const channel = this.resolveChannel(message.guild, args[0]);

		if (!channel) {
			return this.error(message.channel, 'You must specify a channel.');
		}

		const embed = {
			description: args.slice(1).join(' '),
			timestamp: new Date(),
		};

		if (mention && ['everyone', 'here'].includes(mention)) {
			mention = `@${mention}`;
		}

		if (this.config.isPremium) {
			let payload = {
				disableEveryone: false,
				embeds: [embed]
			};
			if (mention) {
				payload.content = mention;
			}

			try {
				await this.sendWebhook(channel, payload, guildConfig);
				return Promise.resolve();
			} catch (err) {
				let payload = { embed };
				if (mention) {
					payload.content = mention;
				}

				this.sendMessage(channel, payload, { disableEveryone: false });
				return Promise.resolve();
			}
		}

		let payload = { embed };
		if (mention) {
			payload.content = mention;
		}

		return this.sendMessage(channel, payload, { disableEveryone: false });
	}

	everyone(message, args, guildConfig) {
		return this.announce(message, args, guildConfig, 'everyone');
	}

	here(message, args, guildConfig) {
		return this.announce(message, args, guildConfig, 'here');
	}

	role(message, args, guildConfig) {
		const role = this.resolveRole(message.guild, args[0]);
		if (!role) {
			return this.error(message.channel, `I can't find that role.`);
		}

		return this.announce(message, args.slice(1), guildConfig, role.mention);
	}
}

module.exports = Announce;

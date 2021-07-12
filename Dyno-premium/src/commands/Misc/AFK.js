'use strict';

const Command = Loader.require('./core/structures/Command');

class AFK extends Command {
	constructor(...args) {
		super(...args);

		this.aliases = ['afk'];
		this.group = 'Misc';
		this.module = 'AFK';
		this.description = `Set an AFK status to display when you are mentioned`;
		this.usage = 'afk [status]';
		this.expectedArgs = 0;
		this.defaultCommand = 'set';
		this.defaultUsage = 'afk';
		this.cooldown = 30000;

		this.commands = [
			{ name: 'set', desc: `Set an AFK status to display when you're mentioned, and change nickname on server.`,
				usage: 'set [status]', cooldown: 61000 },
			{ name: 'ignore', desc: `Use in a channel to not return from AFK when talking in that channel.`,
				usage: `ignore`, cooldown: 5000 },
		];

		this.usage = [
			`afk [status]`,
			`afk set [status] - same as afk [status]`,
			`afk ignore - ignore the channel you're in when you use the command.`,
		];
	}

	execute() {
		this._afk = this.dyno.modules.get('AFK');
		return Promise.resolve();
	}

	set(message, args) {
		const status = args && args.length ? args.join(' ') : 'AFK';

		return this._afk.setAFK(message, status)
			.then(res => this.sendMessage(message.channel, res));
	}

	ignore(message) {
		if (!this.isAdmin(message.author) || !this.isServerMod(message.author, message.channel)) return;
		const guildConfig = this.dyno.guilds.get(message.channel.guild.id);
		return this._afk.ignoreChannel(message, guildConfig)
			.then(res => {
				if (res && res.length) {
					this.success(message.channel, res);
				}
			})
			.catch(err => this.error(message.channel, err));
	}
}

module.exports = AFK;

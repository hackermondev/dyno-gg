'use strict';

const Command = Loader.require('./core/structures/Command');

class Whitelist extends Command {
	constructor(...args) {
		super(...args);

		this.aliases = ['whitelist'];
		this.group = 'Automod';
		this.description = 'Add a url or comma separated list of urls to automod whitelist';
		this.usage = 'whitelist [url]';
		this.example = 'whitelist google.com';
		this.permissions = 'serverMod';
		this.expectedArgs = 1;
		this.cooldown = 3000;
	}

	execute({ message, args, guildConfig }) {
		guildConfig.automod = guildConfig.automod || {};
		guildConfig.automod.whiteurls = guildConfig.automod.whiteurls || [];

		const urls = args.join(' ').replace(/,\s+/g, ',').split(',');

		guildConfig.automod.whiteurls = guildConfig.automod.whiteurls.concat(urls);

		return this.dyno.guilds.update(message.channel.guild.id, { $set: { 'automod.whiteurls': guildConfig.automod.whiteurls } })
			.then(() => this.success(message.channel, `Whitelisted ${urls.length} urls.`))
			.catch(() => this.error(message.channel, 'Something went wrong.'));
	}
}

module.exports = Whitelist;

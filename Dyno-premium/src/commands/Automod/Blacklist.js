'use strict';

const Command = Loader.require('./core/structures/Command');

class Blacklist extends Command {
	constructor(...args) {
		super(...args);

		this.aliases = ['blacklist'];
		this.group = 'Automod';
		this.description = 'Add a url or comma separated list of urls to automod blacklist';
		this.usage = 'blacklist [url]';
		this.example = 'blacklist google.com';
		this.permissions = 'serverMod';
		this.expectedArgs = 1;
		this.cooldown = 3000;
	}

	execute({ message, args, guildConfig }) {
		guildConfig.automod = guildConfig.automod || {};
		guildConfig.automod.blackurls = guildConfig.automod.blackurls || [];

		const urls = args.join(' ').replace(/,\s+/g, ',').split(',');

		guildConfig.automod.blackurls = guildConfig.automod.blackurls.concat(urls);

		return this.dyno.guilds.update(message.channel.guild.id, { $set: { 'automod.blackurls': guildConfig.automod.blackurls } })
			.then(() => this.success(message.channel, `Blacklisted ${urls.length} urls.`))
			.catch(() => this.error(message.channel, 'Something went wrong.'));
	}
}

module.exports = Blacklist;

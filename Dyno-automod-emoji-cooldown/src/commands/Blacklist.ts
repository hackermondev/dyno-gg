import { Command, CommandData } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Blacklist extends Command {
	public aliases     : string[] = ['blacklist'];
	public group       : string   = 'Automod';
	public module      : string   = 'Automod';
	public description : string   = 'Add a url or comma separated list of urls to automod blacklist';
	public usage       : string   = 'blacklist [url]';
	public example     : string   = 'blacklist google.com';
	public permissions : string   = 'serverMod';
	public expectedArgs: number   = 1;
	public cooldown    : number   = 3000;

	public execute({ message, args, guildConfig }: CommandData) {
		guildConfig.automod = guildConfig.automod || {};
		guildConfig.automod.blackurls = guildConfig.automod.blackurls || [];

		const urls = args.join(' ').replace(/,\s+/g, ',').split(',');

		guildConfig.automod.blackurls = guildConfig.automod.blackurls.concat(urls);

		return this.dyno.guilds.update((<eris.GuildChannel>message.channel).guild.id,
			{ $set: { 'automod.blackurls': guildConfig.automod.blackurls } })
				.then(() => this.success(message.channel, `Blacklisted ${urls.length} urls.`))
				.catch(() => this.error(message.channel, 'Something went wrong.'));
	}
}

import { Command, CommandData } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Whitelist extends Command {
	public aliases     : string[] = ['whitelist'];
	public group       : string   = 'Automod';
	public module      : string   = 'Automod';
	public description : string   = 'Add a url or comma separated list of urls to automod whitelist';
	public usage       : string   = 'whitelist [url]';
	public example     : string   = 'whitelist google.com';
	public permissions : string   = 'serverMod';
	public expectedArgs: number   = 1;
	public cooldown    : number   = 3000;

	public execute({ message, args, guildConfig }: CommandData) {
		guildConfig.automod = guildConfig.automod || {};
		guildConfig.automod.whiteurls = guildConfig.automod.whiteurls || [];

		const urls = args.join(' ').replace(/,\s+/g, ',').split(',');

		guildConfig.automod.whiteurls = guildConfig.automod.whiteurls.concat(urls);

		return this.dyno.guilds.update((<eris.GuildChannel>message.channel).guild.id,
			{ $set: { 'automod.whiteurls': guildConfig.automod.whiteurls } })
				.then(() => this.success(message.channel, `Whitelisted ${urls.length} urls.`))
				.catch(() => this.error(message.channel, 'Something went wrong.'));
	}
}

import {Command} from '@dyno.gg/dyno-core';
import * as core from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import {default as TagsModule} from '../index';

export default class Tags extends Command {
	public aliases     : string[] = ['tags'];
	public group       : string   = 'Tags';
	public module      : string   = 'Tags';
	public description : string   = `Get a list of tags, use the tag command to fetch a tag.`;
	public usage       : string   = 'tags';
	public example     : string   = 'tags';
	public expectedArgs: number   = 0;
	public cooldown    : number   = 10000;

	public execute({ message, args, guildConfig }: core.CommandData) {
		const tags: TagsModule = this.dyno.modules.get('Tags');
		if (this.isAdmin(message.author) && args.length) {
			return tags.listTags(message, args[0], guildConfig);
		}

		return tags.listTags(message, (<eris.GuildChannel>message.channel).guild.id, guildConfig)
			.catch((err: string) => this.error(message.channel, err))
			.then((result: string) => {
				this.sendMessage(message.channel, result);
			});
	}
}

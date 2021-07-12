import { Command, CommandData } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import {default as TagsModule} from '../index';

export default class Tags extends Command {
	public aliases     : string[] = ['tags'];
	public group       : string   = 'Tags';
	public module      : string   = 'Tags';
	public description : string   = `Get a list of tags, use the tag command to fetch a tag.`;
	public usage       : string   = 'tags (optional search)';
	public example     : string   = 'tags';
	public expectedArgs: number   = 0;
	public cooldown    : number   = 10000;

	public execute({ message, args, guildConfig }: CommandData) {
		const tags: TagsModule = this.dyno.modules.get('Tags');

		let query;

		if (args && args.length > 0) {
			query = args.join(' ').toLowerCase();
		}

		return tags.listTags(message, (<eris.GuildChannel>message.channel).guild.id, guildConfig, query)
			.catch((err: string) => this.error(message.channel, err))
			.then((result: string) => {
				this.sendMessage(message.channel, result);
			});
	}
}

import { Command, CommandData, SubCommand } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import Tags from '../index';

export default class Tag extends Command {
	public aliases       : string[] = ['tag'];
	public group         : string   = 'Tags';
	public module        : string   = 'Tags';
	public description   : string   = 'Get or create a tag';
	public expectedArgs  : number   = 1;
	public cooldown      : number   = 5000;
	public defaultCommand: string   = 'get';
	public defaultUsage  : string   = 'tag [tag name]';

	public commands: SubCommand[] = [
		{ name: 'get', desc: 'Get a tag by name.', default: true, usage: 'get [tag name]', cooldown: 5000 },
		{ name: 'create', desc: 'Create a new tag.', usage: 'create [tag name] [content]', cooldown: 10000 },
		{ name: 'edit', desc: 'Edit an existing tag.', usage: 'edit [tag name] [content]', cooldown: 10000 },
		{ name: 'delete', desc: 'Delete an existing tag.', usage: 'delete [tag name]', cooldown: 5000 },
	];

	public usage: string[] = [
		'tag [tag name]',
		'tag create [tag name] [content]',
		'tag edit [tag name] [content]',
		'tag delete [tag name]',
	];

	public example: string[] = [
		'tag create how2invite Invite Dyno to your server at https://www.dynobot.net/',
		'tag edit how2invite Invite Dyno to your server at https://www.dynobot.net/invite',
		'tag how2invite',
		'tag delete how2invite',
	];

	private _tags: Tags;

	public execute({ message, args }: CommandData) {
		if (!args || !args.length) {
			return this.error(message.channel, `Please give a tag name`);
		}

		this._tags = this.dyno.modules.get('Tags');
		return Promise.resolve();
	}

	public get({ message, args, guildConfig }: CommandData) {
		if (!args || !args.length) {
			return this.help(message, guildConfig);
		}

		return this._tags.getTag(message, args[0], guildConfig)
			.then((res: string) => this.sendMessage(message.channel, res))
			.catch((err: string) => this.error(message.channel, err));
	}

	public create({ message, args, guildConfig }: CommandData) {
		if (args.length < 2) {
			return this.error(message.channel, `You must give a tag name and tag content.`);
		}

		const invalidMatch = args[0].match(/[^a-zA-Z0-9\.:\-_+\/]/);
		if (invalidMatch) {
			return this.error(message.channel,
				`Tag name \`${args[0].toLowerCase()}\` contains invalid characters. Tag names can only contain letters, numbers, and \`.-_+:/\``);
		}

		if (['create', 'edit', 'delete'].includes(args[0].toLowerCase())) {
			return this.error(message.channel, `${args[0].toLowerCase()} is a reserved word.`);
		}

		return this._tags.createOrEdit(message, args[0], args.slice(1).join(' '), guildConfig)
			.then(() => this.success(message.channel, `Tag ${args[0]} created.`))
			.catch((err: string) => this.error(message.channel, err));
	}

	public async edit({ message, args, guildConfig }: CommandData) {
		if (args.length < 2) {
			return this.error(message.channel, `You must give a tag name and tag content.`);
		}

		try {
			const tag = await this._tags.get((<eris.GuildChannel>message.channel).guild, args[0]);
			if (!tag) {
				return this.error(message.channel, `That tag doesn't exist.`);
			}
		} catch (err) {
			return this.error(message.channel, 'Something went wrong.');
		}

		return this._tags.createOrEdit(message, args[0], args.slice(1).join(' '), guildConfig, true)
			.then(() => this.success(message.channel, `Tag ${args[0]} edited.`))
			.catch((err: string) => this.error(message.channel, err));
	}

	public delete({ message, args, guildConfig }: CommandData) {
		return this._tags.deleteTag(message, args[0], guildConfig)
			.then((res: string) => this.success(message.channel, res))
			.catch((err: string) => this.error(message.channel, err));
	}
}

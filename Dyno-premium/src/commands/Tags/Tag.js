'use strict';

const Command = Loader.require('./core/structures/Command');

class Tag extends Command {
	constructor(...args) {
		super(...args);

		this.aliases = ['tag'];
		this.group = 'Tags';
		this.description = 'Get or create a tag';
		this.expectedArgs = 1;
		this.cooldown = 5000;
		this.defaultCommand = 'get';
		this.defaultUsage = 'tag [tag name]';

		this.commands = [
			{ name: 'get', desc: 'Get a tag by name.', default: true, usage: 'get [tag name]', cooldown: 5000 },
			{ name: 'create', desc: 'Create a new tag.', usage: 'create [tag name] [content]', cooldown: 10000 },
			{ name: 'edit', desc: 'Edit an existing tag.', usage: 'edit [tag name] [content]', cooldown: 10000 },
			{ name: 'delete', desc: 'Delete an existing tag.', usage: 'delete [tag name]', cooldown: 5000 },
		];

		this.usage = [
			'tag create how2invite Invite Dyno to your server at https://www.dynobot.net/',
			'tag edit how2invite Invite Dyno to your server at https://www.dynobot.net/invite',
			'tag how2invite',
			'tag delete how2invite',
		];
	}

	execute({ message, args }) {
		if (!args || !args.length) {
			return this.error(message.channel, `Please give a tag name`);
		}

		this._tags = this.dyno.modules.get('Tags');
		return Promise.resolve();
	}

	get(message, args) {
		return this._tags.get(message, args[0])
			.then(res => this.sendMessage(message.channel, res))
			.catch(err => this.error(message.channel, err));
	}

	create(message, args) {
		if (args.length < 2) {
			return this.error(message.channel, `You must give a tag name and tag content.`);
		}

		const invalidMatch = args[0].match(/[^a-zA-Z0-9\.:\-_+\/]/);
		if (invalidMatch) {
			return this.error(message.channel, `Tag name \`${args[0].toLowerCase()}\` contains invalid characters. Tag names can only contain letters, numbers, and \`.-_+:/\``);
		}

		if (['create', 'edit', 'delete'].includes(args[0].toLowerCase())) {
			return this.error(message.channel, `${args[0].toLowerCase()} is a reserved word.`);
		}

		return this._tags.createOrEdit(message, args[0], args.slice(1).join(' '))
			.then(() => this.success(message.channel, `Tag ${args[0]} created.`))
			.catch(err => this.error(message.channel, err));
	}

	async edit(message, args) {
		if (args.length < 2) {
			return this.error(message.channel, `You must give a tag name and tag content.`);
		}

		try {
			const tag = await this._tags._get(message.guild, args[0]);
			if (!tag) {
				return this.error(`That tag doesn't exist.`);
			}
		} catch (err) {
			return this.error('Something went wrong.');
		}

		return this._tags.createOrEdit(message, args[0], args.slice(1).join(' '))
			.then(() => this.success(message.channel, `Tag ${args[0]} edited.`))
			.catch(err => this.error(message.channel, err));
	}

	delete(message, args) {
		return this._tags.delete(message, args[0])
			.then(res => this.success(message.channel, res))
			.catch(err => this.error(message.channel, err));
	}
}

module.exports = Tag;

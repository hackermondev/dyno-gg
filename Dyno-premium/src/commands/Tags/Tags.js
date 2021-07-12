'use strict';

const Command = Loader.require('./core/structures/Command');

class Tags extends Command {
	constructor(...args) {
		super(...args);

		this.aliases = ['tags'];
		this.group = 'Tags';
		this.description = `Get a list of tags, use the tag command to fetch a tag.`;
		this.usage = 'tags';
		this.expectedArgs = 0;
		this.cooldown = 10000;
	}

	execute({ message, args }) {
		if (this.isAdmin(message.author) && args.length) {
			const tags = this.dyno.modules.get('Tags');
			return tags.list(message, args[0]);
		}

		const tags = this.dyno.modules.get('Tags');
		return tags.list(message)
			.catch(err => this.error(message.channel, err))
			.then(tags => {
				this.sendMessage(message.channel, tags);
			});
	}
}

module.exports = Tags;

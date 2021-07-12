'use strict';

const Module = Loader.require('./core/structures/Module');
const utils = Loader.require('./core/utils');
const { Tag } = require('../core/models');

class Tags extends Module {
	constructor() {
		super();

		this.module = 'Tags';
		this.description = 'Allow users or some roles to create tags';
		this.enabled = true;
		this.hasPartial = true;
	}

	static get name() {
		return 'Tags';
	}

	get settings() {
		return {
			limitCreate: Boolean,
			allowedRoles: { type: Array, default: [] },
		};
	}

	async createOrEdit(message, tag, content) {
		if (!await this.isEnabled(message.channel.guild, this)) return Promise.reject();

		const guildConfig = this.dyno.guilds.get(message.channel.guild.id);
		const tagConfig = guildConfig.tags;

		let edit = false;

		if (tagConfig && tagConfig.limitCreate) {
			let canCreate = false,
				canEdit = false;

			if (this.isAdmin(message.member) ||
				this.isServerAdmin(message.member, message.channel) ||
				this.isServerMod(message.member, message.channel)) {
					canEdit = true;
			}

			if (!canEdit && !canCreate && tagConfig.allowedRoles && tagConfig.allowedRoles.length) {
				for (const id of message.member.roles) {
					if (tagConfig.allowedRoles.find(r => r.id === id)) {
						canCreate = true;
					}
				}
			}

			if (!canEdit && !canCreate) {
				return Promise.reject(`You don't have permissions to create or edit this tag.`);
			}

			try {
				let doc = await Tag.findOne({ guild: message.channel.guild.id, tag: tag }).lean().exec();
				if (doc && doc.author.id === message.member.id) canEdit = true;
				if (doc && !canEdit) {
					return Promise.reject(`You don't have permissions to edit this tag.`);
				}

				if (doc && canEdit) {
					edit = true;
				}
			} catch (err) {
				return Promise.reject(`Something went wrong.`);
			}
		}

		const doc = {
			guild: message.channel.guild.id,
			author: message.author.toJSON(),
			tag,
			content,
		};

		if (edit) {
			delete doc.author;
		}

		try {
			await Tag.update({ guild: message.channel.guild.id, tag: tag }, doc, { upsert: true });
		} catch (err) {
			return Promise.reject(`I can't create that tag.`);
		}

		return Promise.resolve(`Tag ${tag} created.`);
	}

	async delete(message, _tag) {
		if (!await this.isEnabled(message.channel.guild, this)) return Promise.reject();

		try {
			var tag = await Tag.findOne({ guild: message.channel.guild.id, tag: _tag }).lean().exec();
		} catch (err) {
			return Promise.reject('Something went wrong.');
		}

		let canDelete = false;

		if (message.author.id === tag.author.id) canDelete = true;

		if (!canDelete) {
			if (this.isAdmin(message.author)) canDelete = true;
			if (this.isServerAdmin(message.member, message.channel)) canDelete = true;
			if (this.isServerMod(message.member, message.channel)) canDelete = true;
		}

		if (!canDelete) return Promise.reject();

		try {
			await Tag.remove({ _id: tag._id });
		} catch (err) {
			return Promise.reject('Something went wrong.');
		}

		return Promise.resolve(`Tag ${_tag} deleted.`);
	}

	_get(guild, tag) {
		return Tag.findOne({ guild: guild.id, tag }).lean().exec();
	}

	async get(message, tag) {
		if (!await this.isEnabled(message.channel.guild, this)) return Promise.reject();

		try {
			var doc = await Tag.findOne({ guild: message.channel.guild.id, tag }).lean().exec();
		} catch (err) {
			return Promise.reject(`Something went wrong.`);
		}

		if (!doc) return Promise.reject(`No tag ${tag} found.`);
		return Promise.resolve(doc.content);
	}

	async list(message, guildId) {
		if (!await this.isEnabled(message.channel.guild, this)) return Promise.reject();

		guildId = guildId || message.channel.guild.id;

		try {
			var tags = await Tag.find({ guild: guildId }).lean().exec();
		} catch (err) {
			return Promise.reject(`Something went wrong.`);
		}

		if (!tags) return Promise.resolve('There are no tags.');

		const guildConfig = this.dyno.guilds.get(message.channel.guild.id);

		const embed = {
			color: utils.getColor('blue'),
			title: 'Tags',
			footer: { text: `Use "${guildConfig.prefix || '?'}tag name" to show a tag` },
		};

		if (tags.length) {
			let messageParts = utils.splitMessage(tags.map(t => t.tag).join(', '), 2000);
			embed.description = messageParts[0];

			if (messageParts.length > 1) {
				fields = utils.splitMessage(messageParts[1], 1000);

				embed.fields = [];
				for (let field of fields) {
					embed.fields.push({ name: '\u200b', value: field });
				}
			}
		} else {
			return Promise.resolve('There are no tags.');
		}

		// tags = `Tags: ${tags.map(t => t.tag).join(', ')}\n Use \`${guildConfig.prefix || '?'}tag name\` to get a tag`;

		// tags = utils.splitMessage(tags, 1990);
		return Promise.resolve({ embed });
	}
}

module.exports = Tags;

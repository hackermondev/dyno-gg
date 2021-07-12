'use strict';

const moment = require('moment');
const Command = Loader.require('./core/structures/Command');

class Autopurge extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['autopurge'];
		this.group        = 'Manager';
		this.module       = 'Autopurge';
		this.description  = 'Add or remove a channel for automatic purging';
		this.example      = 'autopurge #ranks 4h';
		this.permissions  = 'serverAdmin';
		this.disableDM    = true;
		this.expectedArgs = 1;
		this.defaultCommand = 'list';
		this.defaultUsage = 'autopurge';
		this.requiredPermissions = ['manageMessages'];

		this.commands = [
			{ name: 'list', desc: 'List auto purge channels.', default: true, usage: 'list' },
			{ name: 'enable', desc: 'Enable auto purge for a channel.', usage: 'enable [channel] [interval]' },
			{ name: 'disable', desc: 'Disable auto purge for a channel.', usage: 'enable [channel]' },
		];

		this.usage = [
			'autopurge enable #ranks 4h',
			'autopurge disable #ranks',
			'autopurge list',
		];
	}

	async execute({ message, args }) {
		return Promise.resolve();
	}

	async getDocs(message, channel) {
		let query = channel ? { guild: message.guild.id, channel: channel } : { guild: message.guild.id };

		try {
			var docs = this.models.Autopurge.find(query).lean().exec();
		} catch (err) {
			throw err;
		}

		return docs;
	}

	async list(message) {
		try {
			var docs = await this.getDocs(message);
		} catch (err) {
			this.error(message.channel, 'Something went wrong, please try again.', err);
		}

		if (!docs) {
			return this.sendMessage(message.channel, 'There are no channels setup.');
		}

		let list = docs.map(d => `<#${doc.channel}> - ${doc.interval} minutes`);
		if (!list || !list.length) {
			return this.sendMessage(message.channel, `There are no channels configured on this server.`);
		}

		return this.sendMessage(message.channel, list.join('\n'));
	}

	async enable(message, args) {
		const channel = this.resolveChannel(message.guild, args[0]);
		if (!channel) {
			return this.error(message.channel, `I can't find the channel ${args[0]}.`);
		}

		const interval = this.utils.parseTimeLimit(args[1]);
		if (!interval) {
			return this.error(message.channel, `Please use a valid time interval. Examples: 4h, 8hr, 1d`);
		}

		if (message.guild.id !== this.config.dynoGuild) {
			if ((interval < 240 || interval > 4320) && !this.config.isPremium) {
				return this.error(message.channel, `Purge interval must be more than 4 hours and no more than 3 days. Shorter intervals are available in Dyno Premium.`);
			} else if ((interval < 30 || interval > 10080) && this.config.isPremium) {
				return this.error(message.channel, `Purge interval must be more than 30 minutes and no more than 7 days.`);
			}
		}

		try {
			var docs = await this.getDocs(message);
		} catch (err) {
			return this.error(message.channel, 'Something went wrong, please try again.', err);
		}

		if (!this.config.isPremium && docs && docs.length) {
			return this.error(message.channel, `You already have auto pruge enabled on ${docs.length} channel(s). More channels are available in Dyno Premium.`);
		}

		const doc = new this.models.Autopurge({
			guild: message.guild.id,
			channel: channel.id,
			interval: interval,
			nextPurge: moment().add(interval, 'minutes'),
		});

		return doc.save()
			.then(() => this.success(message.channel, `Enabled auto purge on #${channel.name}.`))
			.catch(err => this.error(message.channel, `Something went wrong, please try again`, err));
	}

	async disable(message, args) {
		const channel = this.resolveChannel(message.guild, args[0]);
		if (!channel) {
			return this.error(message.channel, `I can't find the channel ${args[0]}.`);
		}

		try {
			var docs = await this.getDocs(message, channel.id);
		} catch (err) {
			this.error(message.channel, 'Something went wrong, please try again.', err);
		}

		if (!docs || !docs.length) {
			return this.error(message.channel, `Auto purge isn't enabled for that channel.`);
		}

		const doc = docs[0];

		this.models.Autopurge.find({ _id: doc._id }).remove().exec()
			.then(() => this.success(message.channel, `Disabled auto purge on #${channel.name}`))
			.catch(err => this.error(message.channel, `Something went wrong, please try again.`, err));
	}
}

module.exports = Autopurge;

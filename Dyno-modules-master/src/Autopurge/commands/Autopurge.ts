import { Command, CommandData, SubCommand } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as moment from 'moment-timezone';

export default class Autopurge extends Command {
	public aliases            : string[]          = ['autopurge'];
	public group              : string            = 'Autopurge';
	public module             : string            = 'Autopurge';
	public friendlyName       : string            = 'Autopurge';
	public description        : string            = 'Add or remove a channel for automatic purging';
	public permissions        : string            = 'serverAdmin';
	public cooldown           : number            = 6000;
	public expectedArgs       : number            = 1;
	public defaultCommand     : string            = 'list';
	public defaultUsage       : string            = 'autopurge';
	public requiredPermissions: string[]          = ['manageMessages'];
	public commands           : SubCommand[] = [
		{ name: 'list', desc: 'List auto purge channels.', default: true, usage: 'list' },
		{ name: 'enable', desc: 'Enable auto purge for a channel.', usage: 'enable [channel] [interval]' },
		{ name: 'disable', desc: 'Disable auto purge for a channel.', usage: 'disable [channel]' },
	];
	public usage: string[] = [
		'autopurge enable [channel] [interval]',
		'autopurge disable [channel]',
		'autopurge list',
	];
	public example: string[] = [
		'autopurge enable #ranks 4h',
		'autopurge disable #ranks',
	];

	public async execute() {
		return Promise.resolve();
	}

	public async list({ message, args, guildConfig }: CommandData) {
		let docs;
		try {
			docs = await this.getDocs(message);
		} catch (err) {
			this.error(message.channel, 'Something went wrong, please try again.', err);
		}

		if (!docs) {
			return this.sendMessage(message.channel, 'There are no channels setup.');
		}

		const list = docs.map((doc: any) => {
			const nextPurge = moment(doc.nextPurge).tz(guildConfig.timezone || 'America/New_York').format('llll');
			return `**Channel:** <#${doc.channel}>\n**Interval:** ${doc.interval} minutes\n**Next Purge:** ${nextPurge}`;
		});
		if (!list || !list.length) {
			return this.sendMessage(message.channel, `There are no channels configured on this server.`);
		}

		return this.sendMessage(message.channel, list.join('\n'));
	}

	public async enable({ message, args }: CommandData) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		const channel = this.resolveChannel(guild, args[0]);
		if (!channel) {
			return this.error(message.channel, `I can't find the channel ${args[0]}.`);
		}

		const interval = this.utils.parseTimeLimit(args[1]);
		if (!interval) {
			return this.error(message.channel, `Please use a valid time interval. Examples: 4h, 8hr, 1d`);
		}

		if (guild.id !== this.config.dynoGuild) {
			if ((interval < 240 || interval > 4320) && !this.config.isPremium) {
				return this.error(message.channel,
					`Purge interval must be more than 4 hours and no more than 3 days. Shorter intervals are available in Dyno Premium.`);
			} else if ((interval < 30 || interval > 10080) && this.config.isPremium) {
				return this.error(message.channel, `Purge interval must be more than 30 minutes and no more than 7 days.`);
			}
		}

		let docs;
		try {
			docs = await this.getDocs(message);
		} catch (err) {
			return this.error(message.channel, 'Something went wrong, please try again.', err);
		}

		if (!this.config.isPremium && docs && docs.length) {
			return this.error(message.channel,
				`You already have auto purge enabled on ${docs.length} channel(s). More channels are available in Dyno Premium.`);
		}

		const doc = new this.models.Autopurge({
			guild: guild.id,
			channel: channel.id,
			interval: interval,
			nextPurge: moment().add(interval, 'minutes'),
		});

		return doc.save()
			.then(() => this.success(message.channel, `Enabled auto purge on #${channel.name}.`))
			.catch((err: Error) => this.error(message.channel, `Something went wrong, please try again`, err));
	}

	public async disable({ message, args }: CommandData) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		const channel = this.resolveChannel(guild, args[0]);
		if (!channel) {
			return this.error(message.channel, `I can't find the channel ${args[0]}.`);
		}

		let docs;
		try {
			docs = await this.getDocs(message, channel.id);
		} catch (err) {
			this.error(message.channel, 'Something went wrong, please try again.', err);
		}

		if (!docs || !docs.length) {
			return this.error(message.channel, `Auto purge isn't enabled for that channel.`);
		}

		const doc = docs[0];

		this.models.Autopurge.find({ _id: doc._id }).remove().exec()
			.then(() => this.success(message.channel, `Disabled auto purge on #${channel.name}`))
			.catch((err: Error) => this.error(message.channel, `Something went wrong, please try again.`, err));
	}

	private async getDocs(message: eris.Message, channelId?: string) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		const query = channelId ? { guild: guild.id, channel: channelId } : { guild: guild.id };

		try {
			return await this.models.Autopurge.find(query).lean().exec();
		} catch (err) {
			throw err;
		}
	}
}

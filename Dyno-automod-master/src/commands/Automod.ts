import { Command, CommandData, SubCommand } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Automod extends Command {
	public aliases     : string[] = ['automod'];
	public group       : string   = 'Manager';
	public module      : string   = 'Automod';
	public description : string   = 'Configure automod settings.';
	public defaultUsage: string   = 'automod help';
	public permissions : string   = 'serverAdmin';
	public cooldown    : number   = 5000;
	public expectedArgs: number   = 0;

	public commands: SubCommand[] = [
		{ name: 'blacklist', desc: 'Add/remove a link or links to url blacklist', usage: 'automod blacklist [link|text]' },
		{ name: 'whitelist', desc: 'Add/remove a link or links to url whitelist', usage: 'automod whitelist [link|text]' },
		{ name: 'banword', desc: 'Add/remove a banned word to the list', usage: 'automod banword [word]' },
		{ name: 'ignorechannel', desc: 'Ignore/unignore a channel', usage: 'automod ignorechannel [channel|name]' },
		{ name: 'ignorerole', desc: 'Ignore/unignore a role', usage: 'automod ignorerole [role|name]' },
		{ name: 'ignored', desc: 'List ignored channels and roles', usage: 'automod ignored' },
	];

	public usage: string[] = [
		'automod blacklist [url/part]',
		'automod whitelist [url/part]',
		'automod banword [word]',
		'automod ignorechannel [channel]',
		'automod ignored',
	];

	public example: string[] = [
		'automod blacklist skype.com',
		'automod whitelist dynobot.net',
		'automod banword skype',
		'automod ignorechannel #admins',
		'automod ignorerole Regulars',
		'automod ignored',
	];

	public async execute() {
		return Promise.resolve();
	}

	public blacklist({ message, args, guildConfig }: CommandData) {
		if (!args || !args.length) {
			return this.help(message, guildConfig);
		}

		guildConfig.automod = guildConfig.automod || {};
		guildConfig.automod.blackurls = guildConfig.automod.blackurls || [];

		const urls = args.join(' ').replace(/,\s+/g, ',').split(',');

		guildConfig.automod.blackurls = guildConfig.automod.blackurls.concat(urls);

		return this.dyno.guilds.update((<eris.GuildChannel>message.channel).guild.id,
			{ $set: { 'automod.blackurls': guildConfig.automod.blackurls } })
				.then(() => this.success(message.channel, `Blacklisted ${urls.length} urls.`))
				.catch(() => this.error(message.channel, 'Something went wrong.'));
	}

	public whitelist({ message, args, guildConfig }: CommandData) {
		if (!args || !args.length) {
			return this.help(message, guildConfig);
		}

		guildConfig.automod = guildConfig.automod || {};
		guildConfig.automod.whiteurls = guildConfig.automod.whiteurls || [];

		const urls = args.join(' ').replace(/,\s+/g, ',').split(',');

		guildConfig.automod.whiteurls = guildConfig.automod.whiteurls.concat(urls);

		return this.dyno.guilds.update((<eris.GuildChannel>message.channel).guild.id,
			{ $set: { 'automod.whiteurls': guildConfig.automod.whiteurls } })
				.then(() => this.success(message.channel, `Whitelisted ${urls.length} urls.`))
				.catch(() => this.error(message.channel, 'Something went wrong.'));
	}

	public banword({ message, args, guildConfig }: CommandData) {
		if (!args || !args.length) {
			return this.help(message, guildConfig);
		}

		guildConfig.automod = guildConfig.automod || {};
		guildConfig.automod.badwords = guildConfig.automod.badwords || [];

		let words = args.join(' ').replace(/,\s+/g, ',').split(',');
		words = words.filter((w: string) => w.length > 2);

		if (!words || !words.length) {
			return this.error(message.channel, `Please use a word or comma separate list of words atleast two characters long.`);
		}

		guildConfig.automod.badwords = guildConfig.automod.badwords.concat(words);
		guildConfig.automod.badwords = [...new Set(guildConfig.automod.badwords)];

		return this.dyno.guilds.update((<eris.GuildChannel>message.channel).guild.id,
			{ $set: { 'automod.badwords': guildConfig.automod.badwords } })
				.then(() => this.success(message.channel, `Banned ${words.length} words.`))
				.catch(() => this.error(message.channel, 'Something went wrong.'));
	}

	public ignorechannel({ message, args, guildConfig }: CommandData) {
		if (!args || !args.length) {
			return this.help(message, guildConfig);
		}

		const channel = this.resolveChannel((<eris.GuildChannel>message.channel).guild, args[0]);
		if (!channel) {
			return this.error(message.channel, `Please enter a valid channel.`);
		}

		guildConfig.automod = guildConfig.automod || {};
		guildConfig.automod.ignoredChannels = guildConfig.automod.ignoredChannels || [];

		const index = guildConfig.automod.ignoredChannels.findIndex((c: any) => c.id === channel.id);
		let status = 'enabled';

		if (index === -1) {
			guildConfig.automod.ignoredChannels.push({ id: channel.id, name: channel.name });
			status = 'disabled';
		} else {
			guildConfig.automod.ignoredChannels.splice(index, 1);
		}

		return this.dyno.guilds.update((<eris.GuildChannel>message.channel).guild.id,
			{ $set: { 'automod.ignoredChannels': guildConfig.automod.ignoredChannels } })
				.then(() => this.success(message.channel, `Automod ${status} in ${channel.mention}.`))
				.catch(() => this.error(message.channel, 'Something went wrong.'));
	}

	public ignorerole({ message, args, guildConfig }: CommandData) {
		if (!args || !args.length) {
			return this.help(message, guildConfig);
		}

		const role = this.resolveRole((<eris.GuildChannel>message.channel).guild, args.join(' '));
		if (!role) {
			return this.error(message.channel, `Please enter a valid role.`);
		}

		guildConfig.automod = guildConfig.automod || {};
		guildConfig.automod.ignoredRoles = guildConfig.automod.ignoredRoles || [];

		const index = guildConfig.automod.ignoredRoles.findIndex((r: any) => r.id === role.id);
		let status = 'enabled';

		if (index === -1) {
			guildConfig.automod.ignoredRoles.push({ id: role.id, name: role.name });
			status = 'disabled';
		} else {
			guildConfig.automod.ignoredRoles.splice(index, 1);
		}

		return this.dyno.guilds.update((<eris.GuildChannel>message.channel).guild.id,
			{ $set: { 'automod.ignoredRoles': guildConfig.automod.ignoredRoles } })
				.then(() => this.success(message.channel, `Automod ${status} for the ${role.name} role.`))
				.catch(() => this.error(message.channel, 'Something went wrong.'));
	}

	public ignored({ message, args, guildConfig }: CommandData) {
		if (!guildConfig.automod) {
			return this.error(message.channel, `Automod is not configured yet.`);
		}

		if (!guildConfig.automod.ignoredChannels && !guildConfig.automod.ignoredRoles) {
			return this.sendMessage(message.channel, `There are no channels or roles ignored by automod.`);
		}

		let channels;
		if (guildConfig.automod.ignoredChannels) {
			channels = guildConfig.automod.ignoredChannels.map((c: any) => {
				const channel = this.client.getChannel(c.id);
				return channel || `#${c.name || 'Unknown Channel'} (Deleted)`;
			});
		}

		let roles;
		if (guildConfig.automod.ignoredRoles) {
			roles = guildConfig.automod.ignoredRoles.map((r: any) => {
				const role = (<eris.GuildChannel>message.channel).guild.roles.get(r.id);
				return role ? `<@&${r.id}>` : `${r.name || 'Unknown Role'} (Deleted)`;
			});
		}

		const embed = {
			color: this.utils.getColor('blue'),
			fields: [
				{ name: 'Ignored Channels', value: (channels && channels.length) ?
					channels.map((c: eris.GuildChannel) => `${c.mention}`).join('\n') :
					'None' },
				{ name: 'Ignored Roles', value: (roles && roles.length) ?
					roles.join('\n') :
					'None' },
			],
			timestamp: (new Date()).toISOString(),
		};

		return this.sendMessage(message.channel, { embed });
	}
}

/* eslint-disable no-unused-vars */
'use strict';

const each = require('async-each');
const superagent = require('superagent');
const Command = Loader.require('./core/structures/Command');
const utils = Loader.require('./core/utils');

class Data extends Command {

	constructor(...args) {
		super(...args);

		this.aliases      = ['data'];
		this.group        = 'Admin';
		this.description  = 'Get various stats and data.';
		this.defaultCommand = 'user';
		this.permissions  = 'admin';
		this.overseerEnabled = true;
		this.hideFromHelp = true;
		this.expectedArgs = 0;

		this.commands = [
			{ name: 'user', desc: 'Get information about a user.', default: true },
			{ name: 'guilds', desc: 'Get a list of guilds.' },
			{ name: 'guild', desc: 'Get information about a guild.' },
			{ name: 'automod', desc: 'Get automod stats.' },
			{ name: 'topshared', desc: 'Top list of bots with guild counts and shared guilds' },
		];

		this.usage = [
			'data [user]',
			'data user [user]',
			'data guilds [page]',
			'data automod',
		];
	}

	permissionsFn({ message }) {
		if (!message.member) return false;
		if (message.guild.id !== this.config.dynoGuild) return false;

		if (this.isServerAdmin(message.member, message.channel)) return true;
		if (this.isServerMod(message.member, message.channel)) return true;

		let allowedRoles = [
			'225209883828420608', // Accomplices
			'222393180341927936', // Regulars
		];

		const roles = message.guild.roles.filter(r => allowedRoles.includes(r.id));
		if (roles && message.member.roles.find(r => roles.find(role => role.id === r))) return true;

		return false;
	}

	execute({ message }) {
		return Promise.resolve();
	}

	async guilds(message, args) {
		try {
			var guilds = await this.models.Server.find({ deleted: false })
				.sort({ memberCount: -1 })
				.limit(25)
				.skip(args[0] ? (args[0] - 1) * 25 : 0)
				.lean()
				.exec();
		} catch (err) {
			return this.error(message.channel, err);
		}

		if (!guilds || !guilds.length) {
			return this.sendMessage(message.channel, 'No guilds returned.');
		}

		const embed = {
			title: `Guilds - ${args[0] || 0}`,
			fields: [],
		};

		for (let guild of guilds) {
			embed.fields.push({
				name: guild.name,
				value: `${guild._id}\t${guild.region}\t${guild.memberCount} members`,
				inline: true,
			});
		}

		return this.sendMessage(message.channel, { embed });
	}

	async guild(message, args) {
		try {
			var guild = await this.models.Server.findOne({ _id: args[0] || message.channel.guild.id }).lean().exec();
		} catch (err) {
			return this.error(message.channel, err);
		}

		if (!guild) {
			return this.sendMessage(message.channel, 'No guild found.');
		}

		if (guild.ownerID) {
			var owner = await this.restClient.getRESTUser(guild.ownerID).catch(() => false);
		}

		const embed = {
			author: {
				name: guild.name,
				icon_url: guild.iconURL,
			},
			fields: [
				{ name: 'Region', value: guild.region || 'Unknown', inline: true },
				{ name: 'Members', value: guild.memberCount ? guild.memberCount.toString() : '0', inline: true },
				{ name: 'Owner ID', value: guild.ownerID || 'Unknown', inline: true },
			],
			footer: { text: `ID: ${guild._id}` },
			timestamp: new Date(),
		};

		if (owner) {
			embed.fields.push({ name: 'Owner', value: owner ? `${utils.fullName(owner)}` : guild.ownerID || 'Unknown', inline: true });
		}

		embed.fields.push({ name: 'Prefix', value: guild.prefix || '?', inline: true });

		embed.fields.push({ name: 'Mod Only', value: guild.modonly ? 'Yes' : 'No', inline: true });
		embed.fields.push({ name: 'Premium', value: guild.isPremium ? 'Yes' : 'No', inline: true });
		if (guild.beta) {
			embed.fields.push({ name: 'Beta', value: guild.beta ? 'Yes' : 'No', inline: true });
		}

		// START MODULES
		const modules = this.dyno.modules.filter(m => !m.admin && !m.core && m.list !== false);

		if (!modules) {
			return this.error(message.channel, `Couldn't get a list of modules.`);
		}

		const enabledModules = modules.filter(m => !guild.modules.hasOwnProperty(m.name) ||
			guild.modules[m.name] === true);
		const disabledModules = modules.filter(m => guild.modules.hasOwnProperty(m.name) &&
			guild.modules[m.name] === false);

		embed.fields.push({ name: 'Enabled Modules', value: enabledModules.map(m => m.name).join(', '), inline: false });
		embed.fields.push({ name: 'Disabled Modules', value: disabledModules.map(m => m.name).join(', '), inline: false });

		embed.fields.push({ name: '\u200b', value: `[Dashboard](https://www.dynobot.net/server/${guild._id})`, inline: true });

		return this.sendMessage(message.channel, { embed });
	}

	async user(message, args) {
		if (args && args.length) {
			var resolvedUser = this.resolveUser(message.channel.guild, args.join(' '));
		}

		if (!resolvedUser) {
			resolvedUser = await this.dyno.restClient.getRESTUser(args[0]).catch(() => false);
		}

		const userId = resolvedUser ? resolvedUser.id : args[0] || message.author.id;
		const user = resolvedUser;

		try {
			var guilds = await this.models.Server
				.find({ ownerID: userId })
				.sort({ memberCount: -1 })
				.lean()
				.exec();
		} catch (err) {
			return this.error(`Unable to get guilds.`);
		}

		const userEmbed = {
			author: {
				name: `${user.username}#${user.discriminator}`,
				icon_url: resolvedUser.avatarURL,
			},
			fields: [],
		};

		userEmbed.fields.push({ name: 'ID', value: user.id, inline: true });
		userEmbed.fields.push({ name: 'Name', value: user.username, inline: true });
		userEmbed.fields.push({ name: 'Discrim', value: user.discriminator, inline: true });

		await this.sendMessage(message.channel, { embed: userEmbed });

		if (!guilds || !guilds.length) return Promise.resolve();

		const embed = {
			title: 'Owned Guilds',
			fields: [],
		};

		// START MODULES
		const modules = this.dyno.modules.filter(m => !m.admin && !m.core && m.list !== false);

		if (!modules) {
			return this.error(message.channel, `Couldn't get a list of modules.`);
		}

		for (const guild of guilds) {
			let valArray = [
				`Region: ${guild.region}`,
				`Members: ${guild.memberCount}`,
				`Prefix: ${guild.prefix || '?'}`,
			];

			if (guild.modonly) {
				valArray.push(`Mod Only: true`);
			}
			if (guild.beta) {
				valArray.push(`Beta: true`);
			}
			if (guild.isPremium) {
				valArray.push(`Premium: true`);
			}
			if (guild.deleted) {
				valArray.push(`Kicked/Deleted: true`);
			}

			let disabledModules = modules.filter(m => guild.modules.hasOwnProperty(m.name) && guild.modules[m.name] === false);

			if (disabledModules && disabledModules.length) {
				valArray.push(`Disabled Modules: ${disabledModules.map(m => m.name).join(', ')}`);
			}

			valArray.push(`[Dashboard](https://www.dynobot.net/server/${guild._id})`);

			embed.fields.push({
				name: `${guild.name} (${guild._id})`,
				value: valArray.join('\n'),
				inline: false,
			});
		}

		return this.sendMessage(message.channel, { embed });
	}

	async automod(message) {
		try {
			var counts = await this.redis.hgetallAsync('automod.counts');
		} catch (err) {
			return this.error(message.channel, err);
		}

		const embed = {
			title: 'Automod Stats',
			fields: [
				{ name: 'All Automods', value: counts.any, inline: true },
				{ name: 'Spam/Dup Chars', value: counts.spamdup, inline: true },
				{ name: 'Caps', value: counts.manycaps, inline: true },
				{ name: 'Bad Words', value: counts.badwords, inline: true },
				{ name: 'Emojis', value: counts.manyemojis, inline: true },
				{ name: 'Link Cooldown', value: counts.linkcooldown, inline: true },
				{ name: 'Any Link', value: counts.anylink, inline: true },
				{ name: 'Blacklist Link', value: counts.blacklistlink, inline: true },
				{ name: 'Invite', value: counts.invite, inline: true },
				{ name: 'Attach/Embed Spam', value: counts.attachments, inline: true },
				{ name: 'Attach Cooldown', value: counts.attachcooldown, inline: true },
				{ name: 'Rate Limit', value: counts.ratelimit, inline: true },
				{ name: 'Chat Clearing', value: counts.spamclear, inline: true },
				{ name: 'Light Mentions', value: counts.mentionslight, inline: true },
				{ name: 'Mention Bans', value: counts.mentions, inline: true },
				{ name: 'Auto Mutes', value: counts.mutes, inline: true },
				{ name: 'Forced Mutes', value: counts.forcemutes, inline: true },
			],
			timestamp: new Date(),
		};

		return this.sendMessage(message.channel, { content: 'Note: Automod stats from Dec. 29, 2016', embed });
	}

	invite(message, args) {
		if (!args || !args.length) return this.error(message.channel, `No name or ID specified.`);
		this.client.guilds.find(g => g.id === args[0] || g.name === args.join(' '))
			.createInvite({ max_age: 60 * 30 })
			.then(invite => this.success(message.channel, `https://discord.gg/${invite.code}`))
			.catch(() => this.error(message.channel, `Couldn't create invite.`));
	}

	async topshared(message) {
		try {
			const dres = await superagent.get(`https://bots.discord.pw/api/bots`)
				.set('Authorization', this.config.dbots.key)
				.set('Accept', 'application/json');
			const res = await superagent.get(this.config.carbon.list);
			var data = res.body;
			var dbots = dres.body;
		} catch (err) {
			return this.logger.error(err);
		}

		if (!data || !data.length) return;

		let i = 0;

		const list = data.map(bot => {
				bot.botid = bot.botid;
				bot.servercount = parseInt(bot.servercount);
				return bot;
			})
			.filter(bot => bot.botid > 1000 && bot.servercount >= 25000)
			.sort((a, b) => (a.servercount < b.servercount) ? 1 : (a.servercount > b.servercount) ? -1 : 0);
		// `${++i} ${utils.pad(bot.name, 12)} - ${bot.servercount}`

		return new Promise(async (resolve) => {
			let bots = [];
			for (let bot of list) {
				bot.botid = bot.botid.replace('195244341038546948', '195244363339530240');
				let allShared = await this.ipc.awaitResponse('shared', { user: bot.botid });
				bot.shared = allShared.reduce((a, b) => {
					a += parseInt(b.result);
					return a;
				}, 0);
				bots.push(bot);
			}
			bots = bots.map(b => {
				++i;
				return `${utils.pad('' + i, 2)} ${utils.pad(b.name, 12)} ${utils.pad('' + b.servercount, 6)} Guilds, ${utils.pad('' + b.shared, 5)} Shared`;
			});
			this.sendCode(message.channel, bots.join('\n'));
			return resolve();
		});
	}

	permissionsFor(message, args) {
		if (!args || !args.length) return this.error(message.channel, `No name or ID specified.`);
		const guild = this.client.guilds.find(g => g.id === args[0] || g.name === args.join(' '));

		if (!guild) {
			return this.error(message.channel, `Couldn't find that guild.`);
		}

		const perms = guild.members.get(this.client.user.id);

		const msgArray = utils.splitMessage(perms, 1950);

		for (let m of msgArray) {
			this.sendCode(message.channel, m, 'js');
		}
	}
}

module.exports = Data;

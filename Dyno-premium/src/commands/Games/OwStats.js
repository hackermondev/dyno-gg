'use strict';

const superagent = require('superagent');
const Command = Loader.require('./core/structures/Command');
const { OwUser } = require('../../core/models');

/**
 * OwStats command contributed by Aurieh#0258
 */
class OwStats extends Command {
	constructor(...args) {
		super(...args);

		this.aliases = ['ow'];
		this.group = 'Games';
		this.description = 'Get Overwatch stats';
		this.cooldown = 8000;
		this.expectedArgs = 0;
		this.defaultCommand = 'get';
		this.defaultUsage = 'ow';

		this.commands = [
			{ name: 'get', desc: 'Get overwatch stats for a user', usage: 'get [battletag]', cooldown: 5000 },
			{ name: 'register',
				desc: 'Register your battletag with the bot.', usage: 'register [battletag] [platform=pc|xbl|psn]',
				cooldown: 5000 },
		];

		this.usage = [
			'ow - get your own stats',
			'ow NoobLance#1754 - get someone elses stats',
			'ow register NoobLance#1754',
		];
	}

	execute() {
		return Promise.resolve();
	}

	getBattletag(user) {
		return new Promise((resolve) => {
			OwUser.findOne({ user: user.id }).lean().exec()
				.then(doc => resolve(doc))
				.catch(() => resolve());
		});
	}

	register(message, args) {
		if (!args.length) {
			const guildConfig = this.dyno.guilds.get(message.channel.guild.id);
			return this.help(message, guildConfig);
		}

		if (args[1] && !['pc', 'xbl', 'pc'].includes(args[1])) {
			return this.error(message.channel, `Please enter a valid platform psn|xbl|pc`);
		}

		const battletag = args[0].replace('#', '-').split('-');

		if (battletag.length < 2) return this.error(message.channel, 'Please use the BattleTag#0000 format.');

		const doc = {
			user: message.author.id,
			username: battletag[0],
			discrim: battletag[1],
			platform: args[1] || '',
		};

		return OwUser.update({ user: message.id }, doc, { upsert: true })
			.then(() => this.success(message.channel, `Registered your battletag.`))
			.catch(() => this.error(message.channel, 'Something went wrong.'));
	}

	async get(message, args) {
		let user;
		let platform;

		if (!args || !args.length) {
			var res = await this.getBattletag(message.author);
			if (!res) {
				return this.error(message.channel, `You haven't registered your BattleTag, do that with the ow register`);
			}

			user = `${res.username}-${res.discrim}`;
			platform = res.platform;
		} else {
			user = args[0].replace('#', '-');
			platform = args[1] ? `?platform=${args[1]}` : '';
		}

		const url = `https://owapi.net/api/v2/u/${user}/stats/general?platform=${platform}`;

		try {
			var response = await superagent.get(url);
		} catch (e) {
			return this.sendMessage(message.channel, 'User not found or there was an error..');
		}

		if (response.status !== 200) {
			return this.sendMessage(message.channel, 'User not found.');
		}

		let embed = {
			author: {
				name: user.replace('-', '#'),
				icon_url: response.body.overall_stats.avatar,
			},
			fields: [],
		};

		embed.fields.push({
			inline: true,
			name: 'Level',
			value: response.body.overall_stats.level.toString(),
		});
		embed.fields.push({
			inline: true,
			name: 'Prestige',
			value: response.body.overall_stats.prestige.toString(),
		});
		embed.fields.push({
			inline: true,
			name: 'Games Won',
			value: response.body.game_stats.games_won.toString(),
		});
		embed.fields.push({
			inline: true,
			name: 'K/D',
			value: response.body.game_stats.kpd.toString(),
		});
		embed.fields.push({
			inline: true,
			name: 'Avg. Damage Done',
			value: response.body.average_stats.damage_done_avg.toString(),
		});
		embed.fields.push({
			inline: true,
			name: 'Avg. Eliminations',
			value: response.body.average_stats.eliminations_avg.toString(),
		});
		embed.fields.push({
			inline: true,
			name: 'Avg. Final Blows',
			value: response.body.average_stats.final_blows_avg.toString(),
		});
		embed.fields.push({
			inline: true,
			name: 'Avg. Deaths',
			value: response.body.average_stats.deaths_avg.toString(),
		});
		embed.fields.push({
			inline: true,
			name: 'Avg. Healing',
			value: response.body.average_stats.healing_done_avg.toString(),
		});

		return this.sendMessage(message.channel, { embed });
	}
}

module.exports = OwStats;

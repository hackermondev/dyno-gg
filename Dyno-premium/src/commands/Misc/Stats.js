'use strict';

const os = require('os');
const moment = require('moment');
const { exec } = require('child_process');
const Command = Loader.require('./core/structures/Command');
const utils = Loader.require('./core/utils');
const redis = require('../../core/redis');

require('moment-duration-format');

class Stats extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['stats'];
		this.group        = 'Misc';
		this.description  = 'Get bot stats.';
		this.usage        = 'stats';
		this.hideFromHelp = true;
		this.cooldown     = 5000;
		this.expectedArgs = 0;
	}

	getFFmpegs() {
		return new Promise((resolve) => {
			exec(`pgrep ffmpeg | wc -l | tr -d ' '`, (err, stdout, stderr) => {
				if (err || stderr) {
					return resolve(0);
				}

				return resolve(stdout);
			});
		});
	}

	async execute({ message, args }) {
		const stateMap = {
			Lance: 0,
			Beta:  1,
			Lunar: 2,
			Carti: 3,
			API:   5,
			Arsen: 6,
		};

		const idMap = Object.keys(stateMap).reduce((obj, key) => {
			obj[stateMap[key]] = key;
			return obj;
		}, {});

		let state = args.length ? (isNaN(args[0]) ? stateMap[args[0]] : args[0]) : this.config.state;
		let stateName = args.length ? (isNaN(args[0]) ? args[0] : idMap[args[0]]) : this.config.stateName;

		if (!state || !stateName) {
			state = this.config.state;
			stateName = this.config.stateName;
		}

		const [shards, guildCounts, vc, ffmpegs] = await Promise.all([
			redis.hgetallAsync(`dyno:stats:${state}`),
			redis.hgetallAsync(`dyno:guilds:${this.config.client.id}`),
			redis.hgetallAsync(`dyno:vc`), // eslint-disable-line
			this.getFFmpegs(),
		]).catch(() => false);

		const data = {};

		data.shards = [];
		for (const key in shards) {
			const shard = JSON.parse(shards[key]);
			data.shards.push(shard);
		}

		// data.guilds = Object.values(guildCounts).reduce((a, b) => a + b, 0);
		data.guilds = utils.sumKeys('guilds', data.shards);
		data.users = utils.sumKeys('users', data.shards);
		// data.voiceConnections = utils.sumKeys('voice', data.shards);
		data.voice = utils.sumKeys('voice', data.shards);
		data.playing = utils.sumKeys('playing', data.shards);
		data.allConnections = [...Object.values(vc)].reduce((a, b) => a + parseInt(b), 0);

		let streams = this.config.isCore ? data.allConnections : `${data.playing}/${data.voice}`,
			uptime = moment.duration(process.uptime(), 'seconds'),
			footer = `${stateName} | Cluster ${this.dyno.options.clusterId || this.dyno.options.shardId} | Shard ${message.channel.guild.shard.id}`;

		const embed = {
			author: {
				name: 'Dyno',
				icon_url: `${this.config.site.host}/${this.config.avatar}`,
			},
			fields: [
				{ name: 'Guilds', value: data.guilds.toString(), inline: true },
				{ name: 'Users', value: data.users.toString(), inline: true },
				{ name: 'Streams', value: streams.toString(), inline: true },
				{ name: 'FFMPEGs', value: ffmpegs.toString(), inline: true },
				{ name: 'Load Avg', value: os.loadavg().map(n => n.toFixed(3)).join(', '), inline: true },
				{ name: 'Free Mem', value: `${utils.formatBytes(os.freemem())} / ${utils.formatBytes(os.totalmem())}`, inline: true },
				{ name: 'Uptime', value: uptime.format('w [weeks] d [days], h [hrs], m [min], s [sec]'), inline: true },
			],
			footer: {
				text: footer,
			},
			timestamp: new Date(),
		};

		embed.fields = embed.fields.filter(f => f.value !== '0');

		return this.sendMessage(message.channel, { embed });
	}
}

module.exports = Stats;

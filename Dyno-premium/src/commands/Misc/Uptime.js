'use strict';

const moment = require('moment');
const Command = Loader.require('./core/structures/Command');
const utils = Loader.require('./core/utils');

require('moment-duration-format');

class Uptime extends Command {
	constructor(...args) {
		super(...args);

		this.aliases = ['uptime', 'up'];
		this.group = 'Misc';
		this.description = 'Get bot uptime';
		this.usage = 'uptime';
		this.cooldown = 3000;
		this.expectedArgs = 0;
	}

	execute({ message }) {
		let uptime = moment.duration(process.uptime(), 'seconds'),
			started = moment().subtract(process.uptime(), 'seconds').format('llll');

		const embed = {
			color: utils.getColor('blue'),
			title: 'Uptime',
			description: uptime.format('w [weeks] d [days], h [hrs], m [min], s [sec]'),
			footer: {
				text: `${this.config.stateName} | Cluster ${this.dyno.options.clusterId || this.dyno.options.shardId} | Shard ${message.channel.guild.shard.id} | Last started on ${started}`,
			},
		};

		return this.sendMessage(message.channel, { embed });
	}
}

module.exports = Uptime;

'use strict';

const axios = require('axios');
const {Command} = require('@dyno.gg/dyno-core');

class Restart extends Command {
	constructor(...args) {
		super(...args);

		this.aliases         = ['restart'];
		this.group           = 'Admin';
		this.description     = 'Restart shards.';
		this.usage           = 'restart';
		this.permissions     = 'admin';
		this.overseerEnabled = true;
		this.expectedArgs    = 0;
		this.cooldown        = 30000;
	}

	async execute({ message, args }) {
		if (!this.isAdmin(message.member) && !this.isOverseer(message.member)) {
			return this.error(`You're not authorized to use this command.`);
		}

		const instances = {
			titan: `http://prod01.dyno.lan:5000/restart`,
			atlas: `http://prod02.dyno.lan:5000/restart`,
			pandora: `http://prod03.dyno.lan:5000/restart`,
		};

		if (args.length && Object.keys(instances).find(i => i.toLowerCase() === args[0].toLowerCase())) {
			if (!args[1]) {
				return this.error(message.channel, `Please specify a cluster #.`);
			}

			try {
				await axios.post(instances[args[0].toLowerCase()], {
					token: this.config.restartToken,
					id: parseInt(args[1]),
				});
				return this.success(message.channel, `Restarting cluster ${args[1]} on ${args[0]}`);
			} catch (err) {
				return this.error(message.channel, err);
			}
		}

		try {
			if (args.length) {
				this.dyno.ipc.send('restart', args[0]);
				return this.success(message.channel, `Restarting cluster ${args[0]}`);
			}

			if (!this.isAdmin(message.member)) {
				return this.error(message.channel, `Please specify a cluster id.`);
			}

			this.dyno.ipc.send('restart');
		} catch (err) {
			this.logger.error(err);
			return this.error(message.channel, `Something went wrong.`);
		}

		return this.success(message.channel, `Restarting all processes.`);
	}
}

module.exports = Restart;

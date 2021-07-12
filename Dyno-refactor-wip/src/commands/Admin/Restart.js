'use strict';

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
		this.cooldown        = 60000;
	}

	execute({ message, args }) {
		if (!this.isAdmin(message.author) || message.author.id !== '77205340050956288') {
			return Promise.reject();
		}

		if (args.length) {
			this.dyno.ipc.send('restart', args[0]);
			return Promise.resolve();
		}

		if (!this.isAdmin(message.author)) {
			return Promise.reject();
		}

		this.dyno.ipc.send('restart');
		return Promise.resolve();
	}
}

module.exports = Restart;

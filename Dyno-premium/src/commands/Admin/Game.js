'use strict';

const Command = Loader.require('./core/structures/Command');

class Game extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['game', 'status'];
		this.group        = 'Admin';
		this.description  = 'Set game status.';
		this.usage        = 'game [text]';
		this.permissions  = 'admin';
		this.extraPermissions = [this.config.owner || this.config.admin];
		this.expectedArgs = 1;
	}

	execute({ args }) {
		this.client.editStatus('online', { name: args.join(' ') });
		return Promise.resolve();
	}
}

module.exports = Game;

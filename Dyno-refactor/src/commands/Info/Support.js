'use strict';

const {Command} = require('@dyno.gg/dyno-core');

class Support extends Command {
	constructor(...args) {
		super(...args);
		this.aliases      = ['support'];
		this.group        = 'Info';
		this.description  = 'Dyno support information.';
		this.usage        = 'support';
		this.expectedArgs = 0;
		this.cooldown     = 60000;
	}

	execute({ message, args }) {
		return this.sendDM(message.author.id,
			`For personal Dyno help, support, or access to updates/events, join our official support server at: https://discord.gg/xAwbw8K`);
	}
}

module.exports = Support;

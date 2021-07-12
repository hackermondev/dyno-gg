'use strict';

const util = require('util');
const Command = Loader.require('./core/structures/Command');

class CfgSet extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['cfgset'];
		this.group        = 'Admin';
		this.description  = 'Set a config key/value on all shards';
		this.usage        = 'cfgset [key] [value]';
		this.permissions  = 'admin';
		this.expectedArgs = 1;
	}

	execute({ message, args }) {
		const payload = {
			key: args[0],
			value: args.slice(1).join(' '),
		};

		return this.dyno.ipc.awaitResponse('cfgset', payload)
			.then(data => this.sendCode(message.channel, data.map(d => util.inspect(d)), 'js'))
			.catch(err => this.sendCode(message.channel, err, 'js'));
	}
}

module.exports = CfgSet;

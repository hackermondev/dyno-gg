/* eslint-disable no-unused-vars */
'use strict';

const os = require('os');
const util = require('util');
const moment = require('moment');
const Command = Loader.require('./core/structures/Command');
const utils = Loader.require('./core/utils');
const models = require('../../core/models');
const redis = require('../../core/redis');
const logger = require('../../core/logger');

class Eval extends Command {

	constructor(...args) {
		super(...args);

		this.name         = 'eval';
		this.aliases      = ['eval', 'e'];
		this.group        = 'Admin';
		this.description  = 'Evaluate js code from discord';
		this.usage        = 'eval [javascript]';
		this.hideFromHelp = true;
		this.permissions  = 'admin';
		this.expectedArgs = 1;
	}

	async execute({ message, args, guildConfig }) {
		let msgArray = [],
			msg = message,
			dyno = this.dyno,
			client = this.client,
			config = this.config,
			result;

		try {
			result = eval(args.join(' '));
		} catch (e) {
			result = e;
		}

		if (result.then) {
			try {
				result = await result;
			} catch (err) {
				result = err;
			}
		}

		msgArray = msgArray.concat(utils.splitMessage(result, 1990));

		for (let m of msgArray) {
			this.sendCode(message.channel, m.toString().replace(process.env.CLIENT_TOKEN, 'potato'), 'js');
		}

		return Promise.resolve();
	}
}

module.exports = Eval;

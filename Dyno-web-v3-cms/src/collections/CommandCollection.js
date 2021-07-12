'use strict';

const Collection = require('./Collection');
const logger = require('../core/logger');
const config = require('../core/config');
const utils = require('../core/utils');
const { Command } = require('../core/models');

/**
 * @class CommandCollection
 * @extends Collection
 */
class CommandCollection extends Collection {
	/**
	 * A collection of commands
	 */
	constructor() {
		super();
		this.loadCommands();
	}

	/**
	 * Load commands
	 */
	async loadCommands() {
		const state = config.beta ? 1 : config.test ? 2 : 0;
		try {
			const commands = await Command.find({ _state: state }).lean().exec();

			for (const command of commands) {
				this.set(command.name, command);
			}
		} catch (err) {
			throw new Error(err);
		}
	}
}

module.exports = CommandCollection;

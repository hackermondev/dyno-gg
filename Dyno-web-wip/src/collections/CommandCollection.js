'use strict';

const Collection = require('./Collection');
const config = require('../core/config');
const { Command } = require('../core/models').models;

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
		const state = config.state;
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

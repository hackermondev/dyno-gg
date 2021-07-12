import * as core from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as each from 'async-each';
import * as glob from 'glob-promise';
import * as minimatch from 'minimatch';
import * as commands from '../../commands';
import EventCollection from '../interfaces/EventCollection';
import { logger } from '../logger';
import {default as models} from '../models';

/**
 * @class CommandCollection
 * @extends EventCollection
 */
export default class CommandCollection extends EventCollection {
	public dyno: Dyno;
	private _client: eris.Client;
	private _config: DynoConfig;

	/**
	 * A collection of commands
	 * @param {Object} config The Dyno configuration object
	 * @param {Dyno} dyno The Dyno instance
	 */
	constructor(config: DynoConfig, dyno: Dyno) {
		super();

		this.dyno = dyno;
		this._client = dyno.client;
		this._config = config;

		this.loadCommands();
	}

	public loadCommands() {
		each(Object.values(commands), (command: core.Command, next: Function) => {
			this.register(command);
			return next();
		}, (err: string) => {
			if (err) {
				logger.error(err);
			}
			logger.info(`[CommandCollection] Registered ${this.size} commands.`);
		});
	}

	/**
	 * Register command
	 */
	public register(Command: any) {
		if (Object.getPrototypeOf(Command).name !== 'Command') {
			return logger.debug('[CommandCollection] Skipping unknown command');
		}

		// create the command
		const command = new Command(this.dyno);

		// ensure command defines all required properties/methods
		command.name = command.aliases[0];

		logger.debug(`[CommandCollection] Registering command ${command.name}`);

		models.Command.update({ name: command.name, _state: this._config.state }, command.toJSON(), { upsert: true })
			.catch((err: string) => logger.error(err));

		if (command.aliases && command.aliases.length) {
			for (const alias of command.aliases) {
				this.set(alias, command);
			}
		}
	}

	/**
	 * Unregister command
	 */
	public unregister(name: string) {
		logger.info(`Unregistering command: ${name}`);

		const command = this.get(name);
		if (!command) {
			return;
		}

		if (!command.aliases && !command.aliases.length) {
			return;
		}

		for (const alias of command.aliases) {
			logger.info(`Removing alias ${alias}`);
			this.delete(alias);
		}
	}
}

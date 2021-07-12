import {Utils} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as each from 'async-each';
import {logger} from './logger';

export default class Dispatcher {
	public dyno: Dyno;
	public utils: Utils = new Utils();
	public events: string[];
	private _client: eris.Client;
	private _config: DynoConfig;
	private _handlers: Map<string, Function>;
	private _listeners: {[key: string]: any[]};
	private _boundListeners: Map<string, Function>;

	constructor(dyno: Dyno) {
		this.dyno = dyno;
		this._client = dyno.client;
		this._config = dyno.config;

		this._handlers = new Map();
		this._listeners = {};
		this._boundListeners = new Map();

		this.events = [
			'channelCreate', 'channelDelete', 'guildMemberAdd', 'guildBanAdd', 'guildBanRemove',
			'guildMemberRemove', 'guildMemberUpdate', 'guildCreate', 'guildDelete', 'guildRoleCreate', 'guildRoleDelete',
			'guildRoleUpdate', 'messageCreate', 'messageDelete', 'messageDeleteBulk', 'messageUpdate', 'userUpdate',
			'voiceChannelJoin', 'voiceChannelLeave', 'voiceChannelSwitch', 'messageReactionAdd', 'messageReactionRemove', 'messageReactionRemoveAll',
		];

		this.registerHandlers();
	}

	get client() {
		return this._client;
	}

	get config() {
		return this._config;
	}

	/**
	 * Register the root event handlers from the events directory
	 */
	public registerHandlers() {
		this.dyno.utils.readdirRecursive(this._config.paths.events).then((files: string[]) => {
			each(files, (file: string, next: Function) => {
				if (file.endsWith('.map')) {
					return next();
				}

				const handler = require(file);
				if (!handler || !handler.name) {
					return logger.error('Invalid handler.');
				}

				this._handlers.set(handler.name, handler);
				logger.debug(`[Dispatcher] Registering ${handler.name} handler`);
				return next();
			}, (err: string) => {
				if (err) {
					logger.error(err);
				}

				logger.info(`[Dispatcher] Registered ${this.events.length} events.`);
			});
		}).catch((err: string) => logger.error(err));
	}

	/**
	 * Bind event listeners and store a reference
	 * to the bound listener so they can be unregistered.
	 */
	public bindListeners() {
		let listenerCount = 0;
		for (const event in this._listeners) {
			// Bind the listener so it can be removed
			this._boundListeners[event] = this.createListener.bind(this, event);
			// Register the listener
			this.client.on(event, this._boundListeners[event]);
			listenerCount++;
		}

		logger.info(`[Dispatcher] Bound ${listenerCount} listeners.`);
	}

	/**
	 * Register event listener
	 */
	public registerListener(event: string, listener: Function, module: string) {
		// Register but don't bind listeners before the client is ready
		if (!this.dyno.isReady) {
			this._listeners[event] = this._listeners[event] || [];
			this._listeners[event].push({ module: module || null, listener: listener });
			return;
		}

		// Remove the listener from listeners if it exists, and re-add it
		const index = this._listeners[event].findIndex((l: any) => l.listener === listener);
		if (index > -1) {
			this._listeners[event].splice(index, 1);
		}

		this._listeners[event].push({ module: module, listener: listener });

		this.client.removeListener(event, this._boundListeners[event]);

		// Bind the listener so it can be removed
		this._boundListeners[event] = this.createListener.bind(this, event);

		// Register the bound listener
		this.client.on(event, this._boundListeners[event]);
	}

	/**
	 * Deregister event listener
	 */
	public unregisterListener(event: string, listener: Function) {
		const index = this._listeners[event].findIndex((l: any) => l.listener === listener);
		if (index > -1) {
			this._listeners[event].splice(index, 1);
		}
	}

	/**
	 * Create an event listener
	 * @param {String} event Event name
	 * @param {...*} args Event arguments
	 */
	public createListener(event: string, ...args: any[]) {
		if (!this._listeners[event]) {
			return;
		}

		const handler = this._handlers.get(event);

		// Check if a root handler exists before calling module listeners
		if (handler) {
			return handler(this, ...args).then((e: any) => {
				if (!e || !e.guildConfig) {
					return;
					// return logger.warn(`${event} no event or guild config`);
				}

				// Check if guild is enabled for the app state
				if (e.guild.id !== this._config.dynoGuild && event !== 'messageCreate') {
					if (!this.guildEnabled(e.guildConfig, e.guild.id)) { return; }
				}

				each(this._listeners[event], (o: any) => {
					if (o.module && e.guild && e.guildConfig) {
						if (!this.moduleEnabled(e.guild, e.guildConfig, o.module)) { return; }
					}

					o.listener(e);
				});
			}).catch((err: string) => err ? logger.error(err) : null);
		}

		// No root handler exists, execute the module listeners
		each(this._listeners[event], (o: any) => o.listener(...args));
	}

	/**
	 * Check if an event handler should continue or not based on app state and guild config
	 */
	private guildEnabled(guildConfig: GuildConfig, guildId: string) {
		const guild = this._client.guilds.get(guildId);

		// handle events based on region, ignore in dev
		if (!guild) { return false; }
		if (this._config.handleRegion && !this.dyno.utils.regionEnabled(guild, this._config)) {
			return false;
		}

		if (this._config.test) {
			if (this._config.testGuilds.includes(guildId) || guildConfig.test) {
				return true;
			}
			return false;
		}

		// premium checks
		if (!this._config.isPremium && guildConfig.isPremium && guildConfig.premiumInstalled) {
			return false;
		}
		if (this._config.isPremium && (!guildConfig.isPremium || !guildConfig.premiumInstalled)) {
			return false;
		}

		if (!this._config.isPremium && guildConfig.clientID && guildConfig.clientID !== this._config.client.id) {
			return false;
		}

		if (guildConfig.beta) {
			// Guild is using beta, but app state is not test/beta
			if (!this._config.test && !this._config.beta) {
				return false;
			}
		} else if (this._config.beta) {
			// App state is beta, but guild is not.
			return false;
		}

		return true;
	}

	/**
	 * Check if a module is enabled or should execute code
	 */
	private moduleEnabled(guild: eris.Guild, guildConfig: GuildConfig, module: any) {
		// Ignore events before the client is ready or guild is cached
		if (!this.dyno.isReady || !guild || !guildConfig) { return false; }
		if (!guildConfig.modules) { return false; }

		const name = module.module || module.name;

		// check if globally disabled
		const globalConfig = this.dyno.globalConfig;
		if (globalConfig && globalConfig.modules.hasOwnProperty(name) &&
			globalConfig.modules[name] === false) { return false; }

		// check if module is disabled
		if (guildConfig.modules.hasOwnProperty(name) && guildConfig.modules[name] === false) {
			return false;
		}

		return true;
	}
}

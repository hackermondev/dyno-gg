'use strict';

const each = require('async-each');
const logger = require('../logger');
const utils = require('../utils');

class EventManager {
	constructor(dyno) {
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
			'voiceChannelJoin', 'voiceChannelLeave', 'voiceChannelSwitch', 'messageReactionAdd',
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
	registerHandlers() {
		utils.readdirRecursive(this._config.paths.events).then(files => {
			for (let file of files) {
				const handler = require(file);
				if (!handler || !handler.name) return logger.error('Invalid handler.');
				this._handlers.set(handler.name, handler);
			}

			logger.info(`Registered ${this.events.size} events.`);
		}).catch(err => logger.error(err));
	}

	/**
	 * Bind event listeners and store a reference
	 * to the bound listener so they can be unregistered.
	 */
	bindListeners() {
		for (let event in this._listeners) {
			// Bind the listener so it can be removed
			this._boundListeners[event] = this.createListener.bind(this, event);
			// Register the listener
			this.client.on(event, this._boundListeners[event]);
		}
	}

	/**
	 * Register event listener
	 * @param {String} event Event name
	 * @param {Function} listener Event listener
	 * @param {String} [module] module name
	 */
	registerListener(event, listener, module) {
		// Register but don't bind listeners before the client is ready
		if (!this.dyno.isReady) {
			this._listeners[event] = this._listeners[event] || [];
			this._listeners[event].push({ module: module || null, listener: listener });
			return;
		}

		// Remove the listener from listeners if it exists, and re-add it
		let index = this._listeners[event].findIndex(l => l.listener === listener);
		if (index > -1) this._listeners[event].splice(index, 1);

		this._listeners[event].push({ module: module, listener: listener });

		this.client.removeListener(event, this._boundListeners[event]);

		// Bind the listener so it can be removed
		this._boundListeners[event] = this.createListener.bind(this, event);

		// Register the bound listener
		this.client.on(event, this._boundListeners[event]);
	}

	/**
	 * Deregister event listener
	 * @param {String} event Event name
	 * @param {Function} listener Event listener
	 */
	unregisterListener(event, listener) {
		let index = this._listeners[event].findIndex(l => l.listener === listener);
		if (index > -1) this._listeners[event].splice(index, 1);
	}

	/**
	 * Create an event listener
	 * @param {String} event Event name
	 * @param {...*} args Event arguments
	 */
	createListener(event, ...args) {
		if (!this._listeners[event]) return;

		const handler = this._handlers.get(event);

		// Check if a root handler exists before calling module listeners
		if (handler) {
			return handler(this, ...args).then(e => {
				if (!e || !e.guildConfig) {
					return;
					// return logger.warn(`${event} no event or guild config`);
				}

				// Check if guild is enabled for the app state
				if (e.guild.id !== this._config.dynoGuild && event !== 'messageCreate') {
					if (!this.guildEnabled(e.guildConfig, e.guild.id)) return;
				}

				each(this._listeners[event], o => {
					if (o.module && e.guild && e.guildConfig) {
						if (!this.moduleEnabled(e.guild, e.guildConfig, o.module)) return;
					}

					o.listener(e);
				});
			}).catch(err => err ? logger.error(err) : false);
		}

		// No root handler exists, execute the module listeners
		each(this._listeners[event], o => o.listener(...args));
	}

	/**
	 * Check if an event handler should continue or not based on app state and guild config
	 * @param {Object} guildConfig Guild configuration
	 * @param {String} guildId Guild ID
	 * @returns {Boolean}
	 */
	guildEnabled(guildConfig, guildId) {
		const guild = this._client.guilds.get(guildId);

		// handle events based on region, ignore in dev
		if (!guild) return false;
		if (this._config.handleRegion && !utils.regionEnabled(guild, this._config)) return false;

		if (this._config.test) {
			if (this._config.testGuilds.includes(guildId) || guildConfig.test) return true;
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

		// Shared state, receive all events
		if (this._config.shared) return true;

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
	 * @param {Guild} guild Guild object
	 * @param {Object} guildConfig Guild configuration
	 * @param {String} module Module name
	 * @return {Boolean}
	 */
	moduleEnabled(guild, guildConfig, module) {
		// Ignore events before the client is ready or guild is cached
		if (!this.dyno.isReady || !guild || !guildConfig) return false;
		if (!guildConfig.modules) return false;

		const name = module.module || module.name;

		// check if globally disabled
		const globalConfig = this.dyno.globalConfig;
		if (globalConfig && globalConfig.modules.hasOwnProperty(name) &&
			globalConfig.modules[name] === false) return false;

		// check if module is disabled
		if (guildConfig.modules.hasOwnProperty(name) && guildConfig.modules[name] === false) {
			return false;
		}

		return true;
	}
}

module.exports = EventManager;

'use strict';

const schedule = require('node-schedule');
const Base = requireReload(require)('./Base');
const logger = requireReload(require)('../logger');

/**
 * Abstract class for classes that represent a module
 * @abstract Module
 * @extends Base
 */
class Module extends Base {
	/**
	 * A log of various guild events and dyno.commands
	 * @param {Object} config The dyno configuration object
	 * @param {Dyno} dyno The Dyno instance
	 */
	constructor() {
		super();
		if (new.target === Module) throw new TypeError('Cannot construct Module instances directly.');

		this.name = this.constructor.name;
		this._boundListeners = new Map();
	}

	/**
	 * Validate class requirements
	 */
	ensureInterface() {
		// required properties
		if (typeof this.module === 'undefined') {
			throw new Error(`${this.constructor.name} command must define module property.`);
		}
		if (typeof this.enabled === 'undefined') {
			throw new Error(`${this.constructor.name} command must define enabled property.`);
		}
	}

	/**
	 * Register event listener
	 * @param  {String} event      Event name
	 * @param  {Function} listener Event listener
	 */
	registerListener(event, listener) {
		const boundListener = listener.bind(this);
		this._boundListeners.set(event, boundListener);
		this.dyno.dispatcher.registerListener(event, boundListener, this);
	}

	_isEnabled(guild, module, guildConfig) {
		if (!guild || !guildConfig) return false;

		const modules = guildConfig ? guildConfig.modules : null;
		if (!modules) return false;

		const name = typeof module === 'string' ? module : module.module || module.name;

		// check if globally disabled
		const globalConfig = this.dyno.globalConfig;
		if (globalConfig && globalConfig.modules.hasOwnProperty(name) &&
			globalConfig.modules[name] === false) return false;

		// check if module is disabled
		if (modules.hasOwnProperty(name) && modules[name] === false) {
			return false;
		}

		if (this.config.test) {
			if (this.config.testGuilds.includes(guild.id) || guildConfig.test) return true;
			return false;
		}

		// premium checks
		if (!this.config.isPremium && guildConfig.isPremium && guildConfig.premiumInstalled) {
			return false;
		}
		if (this.config.isPremium && (!guildConfig.isPremium || !guildConfig.premiumInstalled)) {
			return false;
		}

		if (!this._config.isPremium && guildConfig.clientID && guildConfig.clientID !== this._config.client.id) {
			return false;
		}

		if (this.config.shared) {
			return true;
		}

		if (guildConfig.beta) {
			if (!this.config.test && !this.config.beta) {
				return false;
			}
		} else if (this.config.beta) {
			return false;
		}

		return true;
	}

	/**
	 * Check if a module is enabled for a server, not async for performance
	 * @param  {Object} guild Server object
	 * @param  {Module|String} module Module or module name
	 * @returns {Promise.<Boolean>}
	 */
	isEnabled(guild, module, guildConfig) {
		if (!guild || !this.dyno.isReady) {
			return guildConfig ? false : Promise.resolve(false);
		}

		if (this.config.handleRegion && !this.utils.regionEnabled(guild, this.config)) {
			return guildConfig ? false : Promise.resolve(false);
		}

		return guildConfig ? this._isEnabled(guild, module, guildConfig) :
			new Promise((resolve) => {
				this.dyno.guilds.getOrFetch(guild.id).then(guildConfig =>
					resolve(this._isEnabled(guild, module, guildConfig)))
				.catch(() => resolve(false));
			});
	}

	schedule(interval, task) {
		this.jobs = this.jobs || [];
		this.jobs.push(schedule.scheduleJob(interval, task));
	}

	/**
	 * Start the module
	 */
	_start(client, ...args) {
		this._client = client;

		if (this.start) {
			this.start(client, ...args);
		}
	}

	_unload(...args) {
		logger.info(`Unloading module: ${this.name}`);

		if (this._boundListeners && this._boundListeners.size > 0) {
			for (let [event, listener] of this._boundListeners.entries()) {
				this.dyno.dispatcher.unregisterListener(event, listener);
			}
		}

		if (this.jobs) {
			for (const job of this.jobs) {
				job.cancel();
			}
		}

		try {
			if (this.unload) this.unload(...args);
		} catch (err) {
			logger.error(err);
		}
	}
}

module.exports = Module;

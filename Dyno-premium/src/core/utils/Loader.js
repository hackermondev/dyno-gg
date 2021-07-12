'use strict';

const requireReload = require('require-reload');

let context;

class Loader {
	static setRoot(ctx) {
		context = ctx;
	}

	static require(path, ...args) {
		if (!context) throw new Error('Root context not defined');
		return requireReload(context)(path, ...args);
	}

	static loadCommands(dyno) {
		try {
			var CommandCollection = requireReload(context)('./core/collections/CommandCollection');
		} catch (err) {
			return Promise.reject(err);
		}

		try {
			dyno.commands = new CommandCollection(dyno.config, dyno);
		} catch (err) {
			return Promise.reject(err);
		}

		return Promise.resolve();
	}

	static loadModules(dyno) {
		try {
			var ModuleCollection = requireReload(context)('./core/collections/ModuleCollection');
		} catch (err) {
			return Promise.reject(err);
		}

		try {
			if (dyno.modules.unload) {
				dyno.modules.unload();
			}
			dyno.modules = new ModuleCollection(dyno.config, dyno);
		} catch (err) {
			return Promise.reject(err);
		}

		return Promise.resolve();
	}

	static loadManagers(dyno) {
		try {
			var PermissionsManager = requireReload(context)('./core/managers/PermissionsManager');
			var WebhookManager = requireReload(context)('./core/managers/WebhookManager');
		} catch (err) {
			return Promise.reject(err);
		}

		try {
			dyno.permissions = new PermissionsManager(dyno);
			dyno.webhooks = new WebhookManager(dyno);
		} catch (err) {
			return Promise.reject(err);
		}

		return Promise.resolve();
	}

	static loadConfig(dyno) {
		try {
			var config = requireReload(context)('./core/config');
		} catch (err) {
			return Promise.reject(err);
		}

		dyno.config = config;

		return Promise.resolve(config);
	}
}

module.exports = Loader;

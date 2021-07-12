import {Collection} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as each from 'async-each';
import * as glob from 'glob-promise';
import * as minimatch from 'minimatch';
import * as jsonSchema from 'mongoose_schema-json';
import {logger} from '../logger';
import {default as models} from '../models';

const { Server } = models;

/**
 * @class ModuleCollection
 * @extends Collection
 */
export default class ModuleCollection extends Collection {
	public dyno: Dyno;
	public moduleList: string[];
	private _client: eris.Client;
	private _config: DynoConfig;
	private _listenerCount: number = 0;
	/**
	 * A collection of modules
	 */
	constructor(config: DynoConfig, dyno: Dyno) {
		super();

		this.dyno = dyno;
		this._client = dyno.client;
		this._config = config;

		this.moduleList = this._config.moduleList || [];

		this.loadModules();
	}

	public unload() {
		for (const module of this.values()) {
			module._unload();
			this.delete(module.name);
		}
	}

	/**
	 * Load commands
	 */
	public async loadModules() {
		let files;
		try {
			files = await glob('**/*.js', {
				cwd: this._config.paths.modules,
				root: this._config.paths.modules,
				absolute: true,
			});
			files = files.filter((f: string) => !minimatch(f, '**/commands/*'));
		} catch (err) {
			logger.error(err);
		}

		let modules = [];

		each(files, (file: string, next: Function) => {
			if (file.endsWith('.map')) {
				return next();
			}
			const module = require(file);
			if (module.hasModules) {
				modules = modules.concat(Object.values(module.modules));
				return next();
			}
			modules.push(require(file));
			return next();
		}, (err: string) => {
			if (err) {
				logger.error(err);
			}

			each(modules, (module: any, next: Function) => {
				this.register(module);
				return next();
			}, (e: string) => {
				if (e) {
					logger.error(e);
				}
				logger.info(`[ModuleCollection] Registered ${this.size} modules.`);
			});
		});
	}

	/**
	 * Register module
	 * @param {Function} Module the module class
	 */
	public register(Module: any) {
		if (Object.getPrototypeOf(Module).name !== 'Module') {
			return logger.debug('[ModuleCollection] Skipping unknown module');
		}

		const module = new Module(this.dyno);
		const activeModule = this.get(module.name);
		const globalConfig = this.dyno.globalConfig;

		if (activeModule) {
			logger.debug(`[ModuleCollection] Unloading module ${module.name}`);
			activeModule._unload();
			this.delete(module.name);
		}

		logger.debug(`[ModuleCollection] Registering module ${module.name}`);

		if (module.commands) {
			const commands = Array.isArray(module.commands) ? module.commands : Object.values(module.commands);
			each(commands, (command: any) => this.dyno.commands.register(command));
		}

		// ensure the module defines all required properties/methods
		module.ensureInterface();

		if (!activeModule) {
			const moduleCopy = module.toJSON();

			if (module.settings) {
				moduleCopy.settings = jsonSchema.schema2json(module.settings);

				Server.schema.add({
					[module.name.toLowerCase()]: module.settings,
				});
			}

			models.Module.update({ name: module.name, _state: this._config.state }, moduleCopy, { upsert: true })
				.catch((err: string) => logger.error(err));
		}

		this.set(module.name, module);

		if (this.moduleList.length && !this.moduleList.includes(Module.name)) {
			return;
		}

		if (globalConfig && globalConfig.modules.hasOwnProperty(module.name) &&
			globalConfig.modules[module.name] === false) { return; }

		each(this.dyno.dispatcher.events, (event: string, next: Function) => {
			if (!module[event]) {
				return next();
			}
			module.registerListener(event, module[event]);
			this._listenerCount++;
			next();
		}, (err: string) => {
			if (err) {
				logger.error(err);
			}
			this.get(module.name)._start(this._client);
		});
	}

	/**
	 * Enable or disable a module
	 */
	public async toggle(id: string, name: string, enabled: string|boolean) {
		const guildConfig = await this.dyno.guilds.getOrFetch(id);
		const guild       = this._client.guilds.get(id);
		const module      = this.get(name);
		const key         = `modules.${name}`;

		enabled = enabled === 'true';

		if (!guild || !guildConfig) {
			return Promise.reject(`Couldn't get guild or config for module ${name}.`);
		}

		guildConfig.modules[name] = enabled;

		if (enabled && module && module.enable) { module.enable(guild); }
		if (!enabled && module && module.disable) { module.disable(guild); }

		return this.dyno.guilds.update(guildConfig._id, { $set: { [key]: enabled } });
	}
}

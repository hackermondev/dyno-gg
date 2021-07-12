'use strict';

const jsonSchema = require('mongoose_schema-json');
const Collection = require('./Collection');
const config = require('../core/config');
const { Server, Module } = require('../core/models').models;

/**
 * @class ModuleCollection
 * @extends Collection
 */
class ModuleCollection extends Collection {
	/**
	 * A collection of modules
	 */
	constructor() {
		super();
		this.loadModules();
	}

	/**
	 * Load modules
	 */
	async loadModules() {
		try {
			const modules = await Module.find({ _state: config.state }).lean().exec();

			for (const module of modules) {
				if (module.settings) {
					module.settings = jsonSchema.json2schema(module.settings);
					Server.schema.add({
						[module.name.toLowerCase()]: module.settings,
					});
				}

				this.set(module.name, module);
			}
		} catch (err) {
			throw new Error(err);
		}
	}
}

module.exports = ModuleCollection;

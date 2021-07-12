'use strict';

const { Module } = require('@dyno.gg/dyno-core');

require('moment-duration-format');

/**
 * Associates module
 * @class Associates
 * @extends Module
 */
class Associates extends Module {
	constructor(...args) {
		super(...args);

		this.module = 'Associates';
		this.description = 'Dyno Associates';
		this.enabled = false;
		this.adminEnabled = true;
		this.hasPartial = true;
	}

	static get name() {
		return 'Associates';
	}
}

module.exports = Associates;

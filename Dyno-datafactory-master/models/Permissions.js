'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Permissions schema
 * @type {"mongoose".Schema}
 */
const permissionSchema = new Schema({
	server:   { type: String, ref: 'Server' },
	type:     { type: Number, index: true },
	id:       { type: String },
	commands: { type: Object, default: {} },
});

module.exports = { name: 'Permissions', schema: permissionSchema }

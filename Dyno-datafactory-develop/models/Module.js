'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const moduleSchema = new Schema({
	name: { type: String, index: true, required: true },
	_state: { type: Number, index: true },
}, { strict: false });

module.exports = { name: 'Module', schema: moduleSchema }

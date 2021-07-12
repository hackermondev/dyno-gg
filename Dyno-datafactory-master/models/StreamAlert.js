'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const streamAlertSchema = new Schema({
	service: { type: String, required: true, index: true },
	handle: { type: String, required: true },
	channel: { type: String, required: true },
	guild: { type: String, required: true, index: true },
	webhook: { type: Object, required: true },
	streaming: { type: Boolean, default: false },
}, { strict: false });

module.exports = { name: 'StreamAlert', schema: streamAlertSchema }

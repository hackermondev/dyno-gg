'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reminderSchema = new Schema({
	server:      { type: String, required: true, index: true },
	channel:     { type: String, required: true },
	user:        { type: String, required: true },
	content:     { type: String, required: true },
	createdAt:   { type: Date, default: Date.now },
	completedAt: { type: Date, required: true, index: true },
});

module.exports = { name: 'Reminder', schema: reminderSchema }

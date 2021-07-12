'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const moderationSchema = new Schema({
	server:      { type: String, required: true, index: true },
	userid:      { type: String, required: true, index: true },
	channel:     { type: String, required: true },
	user:        { type: Object, required: true },
	mod:         { type: String },
	role:        { type: String },
	type:        { type: String, required: true },
	createdAt:   { type: Date, default: Date.now },
	completedAt: { type: Date, index: true },
});

module.exports = { name: 'Moderation', schema: moderationSchema }

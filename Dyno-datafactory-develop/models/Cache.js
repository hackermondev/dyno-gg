'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const cacheSchema = new Schema({
	key:        { type: String, unique: true },
	data:       { type: Schema.Types.Mixed },
	createdAt:  { type: Date, default: Date.now, expires: '72h' },
	accessedAt: { type: Date, default: Date.now, expires: '24h' },
});

module.exports = { name: 'Cache', schema: cacheSchema }

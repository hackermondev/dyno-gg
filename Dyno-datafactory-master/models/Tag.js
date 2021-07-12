'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const tagSchema = new Schema({
	guild:       { type: String, required: true, index: true },
	author:      { type: Object, required: true },
	tag:         { type: String },
	content:     { type: String },
	createdAt:   { type: Date, default: Date.now },
});

module.exports = { name: 'Tag', schema: tagSchema }

'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const owUserSchema = new Schema({
	user: { type: String, required: true, unique: true },
	username: { type: String, required: true },
	discrim: { type: String, required: true },
	platform: { type: String, required: true },
});

module.exports = { name: 'OwUser', schema: owUserSchema }

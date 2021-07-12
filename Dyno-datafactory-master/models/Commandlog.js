'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const commandLogSchema = new Schema({
  server:      { type: String, required: true, index: true },
  user:        { type: Object, required: true },
  command:     { type: String, required: true, index: true },
  message:     { type: String, required: true },
  createdAt:   { type: Date, default: Date.now, expires: '7d' },
});

module.exports = { name: 'CommandLog', schema: commandLogSchema }

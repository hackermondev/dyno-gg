'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const modLogSchema = new Schema({
  caseNum:     { type: Number, index: true },
  server:      { type: String, required: true, index: true },
  user:        { type: Object, required: true },
  mod:         { type: Object, required: false },
  type:        { type: String, required: true },
  reason:      { type: String },
  message:     { type: String },
  createdAt:   { type: Date, default: Date.now },
}, { strict: false });

module.exports = { name: 'ModLog', schema: modLogSchema }

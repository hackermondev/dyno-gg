'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const weblogSchema = new Schema({
  guild:     { type: String, required: true, index: true },
  user:      { type: Object, required: true },
  userid:    { type: String, index: true },
  action:    { type: String, required: true },
  ipAddress: { type: String },
  createdAt: { type: Date, default: Date.now },
}, { strict: false });

module.exports =  { name: 'WebLog', schema: weblogSchema }

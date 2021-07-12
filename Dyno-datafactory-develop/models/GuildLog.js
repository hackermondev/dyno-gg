'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const guildLogSchema = new Schema({
  id:     { type: String, required: true, index: true },
  guild:  { type: Object, required: true },
  action: { type: String, required: true },
  time:   { type: Date, default: Date.now },
});

module.exports = { name: 'GuildLog', schema: guildLogSchema }

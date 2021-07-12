'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const messageEmbed = new Schema({
  guild  : { type: String, required: true },
  channel: { type: String, required: true },
  message: { type: String, required: true },
  name   : { type: String, required: true },
  time   : { type: Date, default: Date.now },
  embed  : { type: Object },
});

module.exports = { name: 'MessageEmbed', schema: messageEmbed }

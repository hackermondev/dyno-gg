'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const streamSubscriptionSchema = new Schema({
    service: { type: String, required: true, index: true },
    handle: { type: String, required: true },
    id: { type: String, required: true },
    lastSub: { type: Date, required: true }
}, { strict: false });

module.exports = { name: 'StreamSubscription', schema: streamSubscriptionSchema }

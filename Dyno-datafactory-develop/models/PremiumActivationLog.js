'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const premiumActivationLogSchema = new Schema({
    serverID: { type: String, required: true, index: true },
    serverName: { type: String },
    ownerID: { type: String, required: true, index: true },
    userID: { type: String, required: true, index: true },
    username: { type: String },
    memberCount: { type: Number },
    region: { type: String },
    type: { type: String, required: true, index: true },
    timestamp: { type: String },
    importedFromVipData: { type: Boolean  }
});

module.exports = { name: 'PremiumActivationLog', schema: premiumActivationLogSchema }

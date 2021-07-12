'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const braintreeSubscriptionSchema = new Schema({
	_id: { type: String },
	premiumUserId: { type: String, ref: 'PremiumUser' },
}, { strict: false });

module.exports = { name: 'BraintreeSubscription', schema: braintreeSubscriptionSchema }

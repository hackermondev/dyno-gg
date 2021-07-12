'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

class PremiumUserSchema {
	constructor() {
		this.schema = new Schema({
      _id: { type: String },
      customerId: { type: String },
      subscriptions: [{ type: String, ref: 'BraintreeSubscription' }],
    }, { strict: false });

		this.schema.statics.findAndPopulate = this.findAndPopulate;
		return this.schema;
	}

  findAndPopulate(id) {
    return new Promise((resolve, reject) => {
      this.findOne({ _id: id })
        .populate('subscriptions')
        .exec()
        .catch(reject)
        .then(doc => {
          if (!doc) return resolve();
          return resolve(doc);
        });
    });
  }
}

module.exports = { name: 'PremiumUser', schema: new PremiumUserSchema() }

'use strict';

const superagent = require('superagent');

module.exports = function postWebhook(webhook, payload) {
	return new Promise((resolve, reject) => {
		superagent
			.post(webhook)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json')
			.send(payload)
			.then(resolve)
			.catch(reject);
		});
};

'use strict';

const url = require('url');
const http = require('http');
const https = require('https');
const logger = require('../core/logger');

const redirectCodes = [301, 302, 303, 307];

async function expand(_source, chain = []) {
	if (!_source || !_source.length) {
		return Promise.resolve(chain);
	}

	const source = url.parse(_source);
	const pool = new http.Agent({ maxSockets: Infinity });
	const _http = source.protocol === 'https:' ? https : http;

	const options = {
		protocol: source.protocol,
		hostname: source.hostname,
		path: source.path,
		query: source.query,
		method: 'HEAD',
		followAllRedirects: false,
		timeout: 5000,
		pool: pool,
		headers: { 'user-agent': 'Dyno Service - URL Expander' },
	};

	return new Promise((resolve, reject) => {
		const req = _http.request(options, (result) => {
			if (chain) chain.push(_source);
			if (redirectCodes.includes(result.statusCode)) {
				expand(result.headers.location, chain)
					.then(() => resolve(chain))
					.catch(err => chain && chain.length ? resolve(chain) : reject(err));
			} else {
				return resolve([]);
			}
		});

		req.on('error', err => {
			logger.error(err);
			return chain && chain.length ? resolve(chain) : reject('HTTP error occurred.');
		});

		req.end();
	});
}

exports.expand = expand;


'use strict';

const Controller = require('../core/Controller');
const Shortener = require('../helpers/Shortener');
const Expander = require('../helpers/Expander');
const redis = require('../core/redis');

class Urls extends Controller {

	/**
	 * Constructor
	 * @returns {Object}
	 */
	constructor() {
		super();

		// define routes
		return {
			shorten: {
				method: 'get',
				uri: '/api/v1/urls/shorten',
				handler: this.shorten.bind(this),
			},
			geturl: {
				method: 'get',
				uri: '/api/v1/urls/get',
				handler: this.geturl.bind(this),
			},
			expand: {
				method: 'get',
				uri: '/api/v1/urls/expand',
				handler: this.expand.bind(this),
			},
		};
	}

	async shorten(req, res) {
		if (!req.query.url) {
			return res.status(500).send('URL parameter required.');
		}

		if (!req.query.url.match(/https?:\/\//g)) {
			return res.status(500).send('URL parameter malformed.');
		}

		let key = req.query.unid ? `sc:${req.query.unid}:` + req.query.url.replace(/\W+/g, '') : null;

		if (req.query.unid) {
			try {
				var result = await redis.getAsync(key);
			} catch (err) {} // eslint-disable-line

			if (result) {
				return res.status(500).send(JSON.parse(result));
			}
		}

		try {
			var shortid = await Shortener.shorten('urls', Date.now(), req.query.url);
		} catch (err) {
			return res.status(500).send(err);
		}

		const data = { shortid: shortid };

		if (req.query.unid && key) {
			redis.setex(key, 14400, JSON.stringify(data));
		}

		return res.status(200).send(data);
	}

	async geturl(req, res) {
		if (!req.query.code) {
			return res.status(500).send('Code parameter requried.');
		}

		try {
			var data = await Shortener.geturl('urls', req.query.code);
		} catch (err) {
			return res.status(500).send(err);
		}

		if (!data) {
			return res.status(500).send(`Code not found.`);
		}

		return res.status(200).send(data);
	}

	async expand(req, res) {
		if (!req.query.url) {
			return res.status(500).send('URL parameter required.');
		}

		const key = 'ex:' + req.query.url.replace(/\W+/g, '');

		try {
			var result = await redis.getAsync(key);
		} catch (err) {} // eslint-disable-line

		if (result) {
			let parsed = JSON.parse(result);
			return res.status(200).send({
				source: 'cache',
				routes: parsed,
			});
		}

		Expander.expand(req.query.url)
			.then(urls => {
				if (!urls || !urls.length) {
					return res.status(200).send({
						source: 'direct',
						routes: [],
					});
				}
				redis.setex(key, 14400, JSON.stringify(urls));
				return res.status(200).send({
					source: 'direct',
					routes: urls,
				});
			})
			.catch(err => res.status(500).send(err));
	}
}

module.exports = Urls;

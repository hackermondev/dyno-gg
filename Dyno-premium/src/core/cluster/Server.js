'use strict';

const http = require('http');
const config = require('../config');
const models = require('../models');
const logger = require('../logger');

/**
 * @class Server
 */
class Server {
	/**
	 * HTTP Server
	 * @param {Manager} manager Cluster Manager instance
	 */
	constructor(manager) {
		this.manager = manager;
		this.events = manager.events;

		this.sockets = {};
		this.nextSocketId = 0;

		this.server = http.createServer(this.handleRequest.bind(this))
			.listen(config.webhook.port || 5000);

		this.server.on('connection', socket => {
			let socketId = this.nextSocketId++;
			this.sockets[socketId] = socket;
			socket.on('close', () => {
				delete this.sockets[socketId];
			});
		});

		this.registerWebhook()
			.catch(err => { throw new Error(err); });
	}

	unload() {
		this.server.close();
		for (var socketId in this.sockets) {
			this.sockets[socketId].destroy();
		}
	}

	async registerWebhook() {
		try {
			var doc = await models.Dyno.findOne().lean().exec();
		} catch (err) {
			throw new Error(err);
		}

		const webhook = `${config.webhook.host}:${config.webhook.port}`;

		if (doc.webhooks && doc.webhooks.includes(webhook)) return;

		doc.webhooks = doc.webhooks || [];
		doc.webhooks.push(webhook);

		return models.Dyno.update({ _id: doc._id }, { $set: { webhooks: doc.webhooks } });
	}

	handleRequest(req, res) {
		const parts = req.url.split('/');
		const handler = parts[1];

		let getKey = `get${ucfirst(handler)}`,
			postKey = `post${ucfirst(handler)}`,
			key;

		if (req.method === 'GET' && this[getKey]) {
			key = getKey;
		} else if (req.method === 'POST' && this[postKey]) {
			key = postKey;
		} else {
			return this.end(res, 404, 'Not Found');
		}

		let body = '';
		req.on('data', data => {
			body += data;
		});

		req.on('end', () => {
			const payload = {
				req, res, body,
				path: parts.slice(2),
			};

			this[key](payload);
		});
	}

	end(res, status, body) {
		if (typeof body === 'object' || Array.isArray(body)) {
			body = JSON.stringify(body);
		}

		res.writeHead(status);
		res.write(body);
		return res.end();
	}

	getPing({ res }) {
		return this.end(res, 200, 'Pong!');
	}

	postPing({ res }) {
		return this.events.awaitResponse(null, { op: 'ping' })
			.then(data => this.end(res, 200, data))
			.catch(err => this.end(res, 500, err));
	}

	postToken({ res, body }) {
		return this.events.awaitResponse(null, { op: 'settoken', d: body })
			.then(data => this.end(res, 200, data))
			.catch(err => this.end(res, 500, err));
	}

	postLoadmod({ res, body }) {
		return this.events.awaitResponse(null, { op: 'reload', d: { type: 'modules', name: body } })
			.then(data => this.end(res, 200, data))
			.catch(err => this.end(res, 500, err));
	}

	postLoadcmds({ res }) {
		return this.events.awaitResponse(null, { op: 'reloadcmds', d: null })
			.then(data => this.end(res, 200, data))
			.catch(err => this.end(res, 500, err));
	}

	postDiscrim({ res, body }) {
		if (!body) return this.end(res, 500, 'Invalid request');
		this.events.awaitResponse(null, { op: 'discrim', d: body })
			.then(data => {
				if (!data || !data.length) return this.end(res, 200, []);
				data = data.reduce((a, b) => {
					a = a.concat(b.result);
					return a;
				}, []);
				return this.end(res, 200, [...new Set(data)]);
			})
			.catch(err => this.end(res, 500, err));
	}

	postGuildUpdate({ res, body }) {
		if (!body) return this.end(res, 500, 'Invalid request');

		this.events.broadcast({ op: 'guildUpdate', d: body });

		return this.end(res, 200, 'OK');
	}

	postStats({ res, body }) {
		if (!body) return this.end(res, 500, 'Invalid request');

		this.events.send({ op: 'postStats', d: body });

		return this.end(res, 200, 'OK');
	}

	postReload({ res, body }) {
		if (!body) return this.end(res, 500, 'Invalid request');

		try {
			body = JSON.parse(body);
		} catch (err) {
			logger.error(err);
			return this.end(res, 500, 'Internal error');
		}

		if (!body.c) return this.end(res, 500, 'Invalid request');
		this.manager.reloadModule(body.c);
		return this.end(res, 200, 'OK');
	}
}

function ucfirst(str) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = Server;

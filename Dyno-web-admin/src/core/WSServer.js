'use strict';

const WebSocketServer = require('ws').Server;
const Connection = require('./WSConnection');
const logger = require('./logger').get('WSServer');
const config = require('./config');

class WSServer {
	constructor() {
		this.unavailableConnections = [];
		this.connections = new Map();

		const wss = this.wss = new WebSocketServer({ port: config.client.ws.port });

		wss.on('connection', this.ready.bind(this));
		wss.on('error', err => err ? logger.error(err) : false);
	}

	ready(ws) {
		let connection = new Connection(ws),
			timeout;

		this.unavailableConnections.push(connection);

		ws.once('close', () => {
			if (connection.id) {
				logger.info(`Shard ${connection.id} disconnected.`);
				this.connections.delete(connection.id);
			}
		});

		const identify = (id) => {
			clearTimeout(timeout);
			this.unavailableConnections.splice(this.unavailableConnections.indexOf(connection), 1);

			if (typeof id === 'undefined') {
				return ws.close();
			}

			connection.id = id;
			this.connections.set(id, connection);

			logger.info(`Shard ${connection.id} connected.`);
		};

		timeout = setTimeout(() => {
			connection.removeListener('identify', identify);
			this.unavailableConnections.splice(this.unavailableConnections.indexOf(connection), 1);
		}, (10 * 1000));

		connection.once('identify', identify);
	}

	send(id, e, data) {
		const connection = this.connections.get(id);
		if (!connection) return;

		const payload = {
			op: e,
			d: data,
		};

		connection.send(JSON.stringify(payload));
	}

	broadcast(e, data) {
		const payload = {
			op: e,
			d: data,
		};

		this.wss.clients.forEach(client => {
			client.send(JSON.stringify(payload));
		});
	}
}

module.exports = WSServer;

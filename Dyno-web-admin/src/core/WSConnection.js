'use strict';

const EventEmitter = require('eventemitter3');
const logger = require('./logger').get('WSConnection');

class WSConnection extends EventEmitter {
	constructor(ws) {
		super();

		this.id = null;
		this.ws = ws;

		this.ws.on('message', this.processMessage.bind(this));
	}

	processMessage(message) {
		let data;

		try {
			data = JSON.parse(message);
		} catch (e) {
			return logger.error('Invalid data.');
		}

		if (!data.op) {
			return logger.error('Invalid data.');
		}

		logger.debug(message);

		// if (this[data.op]) {
		// 	this[data.op](data);
		// }

		this.emit(data.op, data.d);
	}
}

module.exports = WSConnection;

'use strict';

const EventEmitter = require('eventemitter3');
const logger = require('../logger');

let utils;

/**
 * @class IPCManager
 * @extends EventEmitter
 */
class IPCManager extends EventEmitter {
	/**
	 * Manages the IPC communications with the shard manager
	 * @param {Dyno} dyno The Dyno instance
	 *
	 * @prop {Number} id Shard ID
	 * @prop {Number} pid Process ID
	 * @prop {Map} commands Collection of IPC commands
	 */
	constructor(dyno) {
		super();

		const config = this._config = dyno.config;

		this._dyno = dyno;
		this._client = dyno.client;

		this.id = dyno.options.clusterId || dyno.options.shardId || 0;
		this.pid = process.pid;
		this.commands = new Map();

		// defining this here because of weirdness I haven't figured out yet
		utils = require('../utils');

		process.on('message', this.onMessage.bind(this));

		utils.readdirRecursive(this._config.paths.ipc).then(files => {
			for (let file of files) {
				const command = require(file);
				this.register(command);
			}

			logger.info(`Registered ${this.commands.size} IPC commands.`);
		}).catch(err => logger.error(err));
	}

	/**
	 * Send a command or event to the shard manager
	 * @param {String} event Event to send
	 * @param {Mixed} data The data to send
	 */
	send(event, data) {
		if (!process.send) return;
		process.send({
			op: event,
			d: data || null,
		});
	}

	/**
	 * Fired when the shard receives a message
	 * @param {Object} message The message object
	 * @returns {*}
	 */
	onMessage(message) {
		if (!message.op) {
			return logger.warn('Received IPC message with no op.');
		}

		if (['resp', 'broadcast'].includes(message.op)) return;

		if (this[message.op]) {
			return this[message.op](message);
		}

		const command = this.commands.get(message.op);

		if (command) {
			return command(this._dyno, this._config, message);
		}

		this.emit(message.op, message.d);
	}

	/**
	 * Send a command and await a response from the shard manager
	 * @param {String} op Op to send
	 * @param {Object} d The data to send
	 * @returns {Promise}
	 */
	awaitResponse(op, d) {
		if (!process.send) return;

		return new Promise((resolve, reject) => {
			const awaitListener = (msg) => {
				if (!['resp', 'error'].includes(msg.op)) return;

				process.removeListener('message', awaitListener);

				if (msg.op === 'resp') return resolve(msg.d);
				if (msg.op === 'error') return reject(msg.d);
			};

			const payload = { op: op };
			if (d) payload.d = d;

			process.on('message', awaitListener);
			process.send(payload);

			setTimeout(() => {
				process.removeListener('message', awaitListener);
				reject('IPC Timed out.');
			}, 5000);
		});
	}

	/**
	 * Register an IPC command
	 * @param {Function} command The command to execute
	 * @returns {*|void}
	 */
	register(command) {
		if (!command || !command.name) return logger.error('Invalid command.');
		this.commands.set(command.name, command);
	}
}

module.exports = IPCManager;

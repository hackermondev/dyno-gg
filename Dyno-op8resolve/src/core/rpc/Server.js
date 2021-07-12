/* eslint-disable no-unused-vars */
const jayson = require('jayson');
const logger = require('../logger');

class Server {
	async init(host, port, methods) {
		this.logger = logger;
		this.host = host;
		this.port = port;
		this.server = jayson.server(methods);

		return new Promise((resolve, reject) => {
			// If the cluster doesn't properly start the RPC server, kill it
			const timeout = setTimeout(() => {
				process.exit(1);
			}, 10000);

			this.server.http().listen(this.port, this.host, () => {
				clearTimeout(timeout);
				resolve();
				this.logger.info(`[RPC] RPC Server succesfully initialized at ${this.host}:${this.port}`);
			});
		})

	}
}

module.exports = Server;

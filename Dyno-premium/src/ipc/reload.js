'use strict';

const path = require('path');
const req = require('require-reload');

module.exports = function reload(dyno, config, message) {
	const fileDir = config.paths[message.d.type];

	try {
		let filePath = path.join(fileDir, message.d.name);

		let obj = req(filePath);
		if (!obj) {
			return process.send({ op: 'resp', d: `Invalid module/command.` });
		}

		dyno[message.d.type].register(obj);
		process.send({ op: 'resp', d: 'success' });
	} catch (err) {
		process.send({ op: 'resp', d: err });
	}
};

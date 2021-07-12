'use strict';

const moment = require('moment');
const Controller = require('../core/Controller');
const config = require('../core/config');

require('moment-duration-format');

/**
 * Index controller
 * @class Index
 * @extends {Controller}
 */
class Index extends Controller {

	/**
	 * Constructor
	 * @returns {Object}
	 */
	constructor() {
		super();

		// define routes
		return {
			index: {
				method: 'get',
				uri: '/api/v1/',
				handler: this.index.bind(this),
			},
		};
	}

	/**
	 * Index handler
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 */
	index(req, res) {
		let uptime = moment.duration(process.uptime(), 'seconds'),
			started = moment().subtract(process.uptime(), 'seconds').format('llll');

		return res.status(200).send({
			name: 'Dyno Service API',
			version: config.version,
			uptime: uptime.format('w [weeks] d [days], h [hrs], m [min], s [sec]'),
			started: started,
		});
	}
}

module.exports = Index;

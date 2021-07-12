'use strict';

const moment = require('moment-timezone');
const Controller = require('../../core/Controller');
const config = require('../../core/config');
const db = require('../../core/models');

class Bans extends Controller {
	constructor(bot) {
		super(bot);

		return {
			get: {
				method: 'post',
				uri: '/api/modules/:id/bans',
				handler: this.getBans.bind(this),
			},
		};
	}

	async getBans(bot, req, res) {
		console.log('in getBans');
		try {
			const bans = await this.client.getGuildBans(req.params.id);
			return res.status(200).send({ bans });
		} catch (err) {
			console.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}
}

// module.exports = Bans;
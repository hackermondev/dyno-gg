'use strict';

const Controller = require('../core/Controller');
const config = require('../core/config');
const logger = require('../core/logger');
const models = require('../core/models');

/**
 * Team controller
 * @class Team
 * @extends {Controller}
 */
class Team extends Controller {

   /**
	* Constructor
	* @returns {Object}
	*/
   constructor(bot) {
		super(bot);

		// define routes
		return {
			team: {
				method: 'get',
				uri: '/team',
				handler: this.team.bind(this),
			},
		};
	}

	async team(bot, req, res) {
		const locals = res.locals;

		locals.section = 'team';
		locals.stylesheets.push('team');

		try {
			const globalConfig = await models.Dyno.findOne({}, { team: 1 }).lean().exec();
			locals.team = globalConfig.team;
		} catch (err) {
			locals.team = config.global.team;
			logger.error(err);
		}

		return res.render('team');
	}
}

module.exports = Team;

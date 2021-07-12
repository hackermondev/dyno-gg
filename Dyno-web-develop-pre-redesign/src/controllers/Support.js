'use strict';

const accounting = require('accounting');
const Controller = require('../core/Controller');
const redis = require('../core/redis');
const logger = require('../core/logger').get('Support');
const moment = require('moment');
const { models } = require('../core/models');

/**
 * Support controller
 * @class Support
 * @extends {Controller}
 */
class Support extends Controller {

	/**
	 * Constructor
	 * @returns {Object}
	 */
	constructor(bot) {
		super(bot);

		// define routes
		return {
			cfg: {
				method: 'get',
				uri: '/support/c/:id',
				handler: this.supportConfig.bind(this),
            },
            api: {
                method: 'get',
                uri: '/api/support/c/:id',
                handler: this.api.bind(this),
            },
		};
	}

	async supportConfig(bot, req, res) {
        res.locals.scripts.push('/js/react/support.js');
        return res.render('support/config', { layout: 'server' });
    }
    
    async api(bot, req, res) {
        if (!req.session || !req.session.user) {
            console.log('No Session');
            return res.status(403).send('Forbidden');
        }

        try {
            let result = await redis.get(`supportcfg:${req.params.id}`);
            if (!result) {
                return res.status(404).send('Config not found.');
            }

            result = JSON.parse(result);
            console.log(result);

            console.log(req.session.user.id, result.userId);
            if (req.session.user.id !== result.userId) {
                return res.status(403).send('Forbidden');
            }

            let config = await models.Server.findOne({ _id: result.guildId }).lean().exec();

            if (config.webhooks) {
                delete config.webhooks;
            }
            return res.send({ config });
        } catch (err) {
            logger.error(err);
            return res.status(500).send('Something went wrong.');
        }
    }
}

module.exports = Support;

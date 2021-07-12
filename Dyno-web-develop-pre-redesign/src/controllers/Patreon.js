'use strict';

const superagent = require('superagent');
const Controller = require('../core/Controller');
const config = require('../core/config');
const logger = require('../core/logger').get('Patreon');
const utils = require('../core/utils');

class Patreon extends Controller {
    constructor(bot) {
        super(bot);

        return {
            patreon: {
                method: 'get',
                uri: '/patreon',
                handler: this.patreon.bind(this),
            },
            pledgeCreate: {
                method: 'post',
                uri: '/patreon/pledges/create',
                handler: this.pledgeCreate.bind(this),
            },
            pledgeUpdate: {
                method: 'post',
                uri: '/patreon/pledges/update',
                handler: this.pledgeUpdate.bind(this),
            },
            pledgeDelete: {
                method: 'post',
                uri: '/patreon/pledges/delete',
                handler: this.pledgeDelete.bind(this),
            },
        };
    }

    patreon(bot, req, res) {
        let response = `Thank You.`;
        if (req.cookies['oauth-patreon']) {
            res.clearCookie('oauth-patreon');
            response += '<script>window.close();</script>';
        }
        return res.send(response);
    }

    /**
     * Pledge create webhook
     * @param {Bot} bot Bot instance
     * @param {Object} req Express request
     * @param {Object} res Express response
     */
    pledgeCreate(bot, req, res) {
        console.log(req.body);
        return res.status(200).send('OK');
    }

    /**
     * Pledge update webhook
     * @param {Bot} bot Bot instance
     * @param {Object} req Express request
     * @param {Object} res Express response
     */
    pledgeUpdate(bot, req, res) {
        console.log(req.body);
        return res.status(200).send('OK');
    }

    /**
     * Pledge delete webhook
     * @param {Bot} bot Bot instance
     * @param {Object} req Express request
     * @param {Object} res Express response
     */
    pledgeDelete(bot, req, res) {
        console.log(req.body);
        return res.status(200).send('OK');
    }
}

module.exports = Patreon;

'use strict';

const accounting = require('accounting');
const Controller = require('../core/Controller');
const timezones = require('../timezones.json');
const { models } = require('../core/models');
const config = require('../core/config');
const logger = require('../core/logger');
const utils = require('../core/utils');
const { Queue } = models;

const redirect_base = (!config.site.port || parseInt(config.site.port) === 80) ?
    `${config.site.host}` :
	`${config.site.host}:${config.site.port}`;

/**
 * Server controller
 */
class Admin extends Controller {

	/**
	 * Constructor
	 * @returns {Object}
	 */
	constructor(bot) {
		super(bot);

		return {
			beforeAdmin: {
				method: 'use',
				uri: [
					'/admin',
					'/admin/*',
				],
				handler: this.beforeAdmin.bind(this),
			},
			admin: {
				method: 'get',
				uri: '/admin/:page?/:tab?',
				handler: this.admin.bind(this),
			},
		};
	}

	/**
	 * Helper method to return if user is an admin of a server
	 * @param {Object} server Server object
	 * @param {Object} user User object
	 * @returns {Boolean}
	 */
	isAdmin(guild, member) {
		if (guild.owner_id === member.id) return true;
		return false;
		// return guild.ownerID === member.id || member.permission.has('administrator') || member.permission.has('manageServer');
	}

	async beforeAdmin(bot, req, res, next) {
		if (!req.session) {
			return next();
		}

		res.locals.externalStylesheets = ['https://cdnjs.cloudflare.com/ajax/libs/hint.css/2.5.0/hint.min.css'];
		res.locals.stylesheets = ['server'];

		if (req.session.isAdmin) {
			res.locals = Object.assign(res.locals, req.session);
			res.locals.isAdmin = true;
		}

		if (!req.session.isAdmin) {
			console.log('Not Overseer');
			return res.redirect('/');
		}

		if (req.session.user) {
			const hash = utils.sha256(`${config.site.secret}${req.session.user.id}`);

			req.session.apiToken = hash;

			if (!res.locals.user) {
				res.locals = Object.assign(res.locals, req.session);
			}

			return next();
		} else {
			return res.redirect('/');
		}
	}

	admin(bot, req, res) {
		if (!req.session || !req.session.auth) return res.redirect('/');
		res.locals.scripts.push('/js/react/admin.js');

		return res.render('admin', { layout: 'server' });
	}
}

module.exports = Admin;

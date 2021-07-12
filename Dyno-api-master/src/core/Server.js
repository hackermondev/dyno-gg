'use strict';

const path = require('path');
const http = require('http');
const express = require('express');
const compression = require('compression');
const removeRoute = require('express-remove-route');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const multer = require('multer');
const morgan = require('morgan');
const logger = require('./logger');
const config = require('./config');
const models = require('./models');
const utils = require('./utils');

const reload = requireReload(require);

/**
 * Express server
 * @class Server
 * @prop {Object} app The express server instance
 */
class Server {
	constructor() {
		process.on('uncaughtException', this.handleException.bind(this));
		process.on('unhandledRejection', this.handleRejection.bind(this));

		this.start();
	}

	async start() {
		await models.Dyno.findOne().lean()
			.then(doc => { config.global = doc; })
			.catch(err => logger.error(err));

		let app = this.app = express();

		/**
		 * Start Web Server setup
		 */
		app.set('port', config.site.listen_port || 9337);
		app.set('views', config.paths.views);

		app.set('view engine', 'hbs');
		app.use(express.static(config.paths.public));
		app.use(bodyParser.json());
		app.use(bodyParser.urlencoded({ extended: true }));
		app.use(compression());
		app.use(multer({ dest: config.paths.uploads }).single('photo'));


		if (!config.test) {
			// setup access control for all routes
			app.use((req, res, next) => {
				res.header('Access-Control-Allow-Credentials', true);
				res.header('Access-Control-Allow-Origin', req.headers.origin);
				res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
				res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
				next();
			});
		}

		// set powered by
		app.use((req, res, next) => {
			res.setHeader('X-Powered-By', config.poweredBy);
			next();
		});

		/**
		 * Morgan to Winston log stream funcion
		 * @type {Object}
		 */
		const stream = {
			write: message => {
				logger.info(message);
			},
		};

		morgan.token('userid', req => req.userid);
		morgan.token('realip', req => req.realip);

		app.use((req, res, next) => {
			req.realip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
			next();
		});
		// stream logs to winston using morgan
		app.use(morgan(':realip - :remote-user [:date[clf]] - :userid ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"',
			{ stream: stream }));

		// set template data
		app.locals = {
			site: {
				title: config.site.title,
			},
			stylesheets: ['app'],
		};

		// load controllers
		utils.readdirRecursive(config.paths.controllers).then(files => {
			files.forEach(file => {
				let Controller = require(file);
				return this.createRoutes(new Controller());
			});
		});

		// create server
		http.createServer(app).listen(app.get('port'), () => {
			logger.info('Express server listening on port %d', app.get('port'));
		});
	}

	/**
	 * Uncaught exception handler
	 * @param {Object} err Error object
	 */
	handleException(err) {
		logger.error(err);
		setTimeout(() => process.exit(), 3000);
	}

	/**
	 * Unhandled rejection handler
	 * @param {*} reason Reason
	 * @param {*} p Promise
	 */
	handleRejection(reason, p) {
		console.error('Unhandled rejection at: Promise ', p, 'reason: ', reason); // eslint-disable-line
	}

	loadController(name) {
		let filePath = path.join(config.paths.controllers, name);
		filePath = filePath.endsWith('.js') ? filePath : filePath + '.js';

		if (!utils.existsSync(filePath)) {
			return Promise.reject(`File does not exist: ${filePath}`);
		}

		let Controller = reload(filePath);
		if (!Controller) {
			return Promise.reject(`Error loading controller.`);
		}

		const controller = new Controller();

		for (let key in controller) {
			let route = controller[key];

			// remove route(s) when reloading controllers
			if (route.uri instanceof Array) {
				for (let uri of route.uri) {
					removeRoute(this.app, uri);
				}
			} else {
				removeRoute(this.app, route.uri);
			}
		}

		this.createRoutes(controller);
		return Promise.resolve();
	}

	/**
	 * Create routes
	 * @param  {Array} routes Array of routes returned by the controller
	 */
	createRoutes(routes) {
		// iterate over the routes defined by the controller
		for (let o in routes) {
			let route = routes[o];

			if (!(route.uri instanceof Array)) {
				if (route.method === 'use') logger.info(`Registering middleware for ${route.uri}`);
				else logger.info(`Creating route for ${route.uri}`);

				// create the express route
				this.app[route.method](route.uri, route.handler.bind(route));
				continue;
			}

			for (let uri of route.uri) {
				if (route.method === 'use') logger.info(`Registering middleware for ${uri}`);
				else logger.info(`Creating route for ${uri}`);

				// create the express route
				this.app[route.method](uri, route.handler.bind(route));
			}
		}
	}
}

module.exports = Server;

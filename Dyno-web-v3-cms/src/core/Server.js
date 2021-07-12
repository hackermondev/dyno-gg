'use strict';

const path = require('path');
const express = require('express');
const keystone = require('keystone');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const flash = require('express-flash');
const exphbs = require('express-handlebars');
const handlebars = require('handlebars');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const morgan = require('morgan');
const logger = require('./logger');
const config = require('./config');
const helpers = require('../helpers/helpers');
const compareHelper = require('../helpers/compare');
const ifArrayHelper = require('../helpers/ifArray');


/**
 * Express server
 * @class Server
 * @prop {String} module The module name
 * @prop {Boolean} enabled Whether the module is enabled by default
 * @prop {Boolean} core Whether this is a core module
 * @prop {Boolean} list Whether to list the module in the dashboard
 * @prop {Object} app The express server instance
 * @prop {Eris} client The eris client instance
 */
class Server {

	constructor() {
		this.module = 'HTTP Server';
		this.enabled = true;
		this.core = true;
		this.list = false;
	}

	/**
	 * Start the server module
	 * @param {Eris} client The eris client instance
	 */
	start(client) {
		let app = this.app = express();

		this.client = client;

		/**
		 * Start Web Server setup
		 */
		app.set('port', config.site.listen_port || 8000);
		app.set('views', config.paths.views);

		const hbsHelpers = Object.assign({
			compare: compareHelper,
			ifArray: ifArrayHelper.ifArray,
			unlessArray: ifArrayHelper.unlessArray,
			dynamicPartial: (name) => name,
		}, helpers());

		for (let [key, val] of Object.entries(hbsHelpers)) {
			handlebars.registerHelper(key, val);
		} 

		// setup handlebars for view rendering
		app.engine('hbs', exphbs({
			extname: '.hbs',
			defaultLayout: 'main',
			partialsDir: [
				path.join(config.paths.views, 'partials'),
				path.join(config.paths.views, 'keystone/partials'),
			],
			compilerOptions: {
				preventIndent: true,
			},
			helpers: Object.assign(hbsHelpers, {
				hbs: function (source, context) {
					context = context || this;
					const template = handlebars.compile(source);
					return template(context);
				},
			}),
		}));

		app.set('view engine', 'hbs');
		app.use(cookieParser(config.site.secret));
		app.use(express.static(config.paths.public));
		app.use(compression());
		app.use(flash());


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

		const sessionOpts = {
			name: 'dynobot.sid',
			secret: config.site.secret,
			resave: false,
			saveUninitialized: true,
			store: new RedisStore({
				host: config.redis.host,
				port: config.redis.port,
				pass: config.redis.auth,
				db: 1,
				ttl: 8 * 60 * 60, // 8 hours
			}),
			cookie: {
				path: '/',
                maxAge: 24 * 60 * 60 * 1000, // 24 hours
            },
		};

		if (!config.test) {
			sessionOpts.cookie.domain = '.dynobot.net';
		}

		// create the session handler using mongodb
		app.use(session(sessionOpts));

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
			req.userid = req.session && req.session.user ? req.session.user.id : 'N/A';
			req.realip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
			if (req.headers['cf-connecting-ip']) {
				req.realip = req.headers['cf-connecting-ip'];
			}
			res.locals = {
				site: {
					title: config.site.title,
					uuid: config.uuid,
				},
				externalStylesheets: [],
				stylesheets: ['app'],
				scripts: [],
			};
			next();
		});

		// stream logs to winston using morgan
		app.use(morgan(':realip - :remote-user [:date[clf]] - :userid ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"',
			{ stream: stream }));

		keystone.init({
			name: 'Dyno',
			brand: 'Dyno',
			port: app.get('port'),

			static: 'public',
			favicon: 'public/favicon.ico',
			'module root': path.join(__dirname, '..', '..'),
			'cloudinary config': process.env.CLOUDINARY_URL,
			'cookie secret': config.site.secret,

			emails: 'keystone/emails',

			'auto update': true,
			session: true,
			'session store': 'mongo',
			auth: true,
			'user model': 'User',
			app: app,
			'view engine': 'hbs',
		});

		keystone.import('models');

		app.locals = Object.assign(app.locals, {
			_: require('lodash'),
			env: keystone.get('env'),
			utils: keystone.utils,
			editable: keystone.content.editable,
		});

		keystone.set('locals', app.locals);

		keystone.set('routes', require('../routes')(app, this.client));

		app.use('/keystone', keystone.Admin.Server.createStaticRouter(keystone));
		app.use('/keystone', keystone.Admin.Server.createDynamicRouter(keystone));

		keystone.set('nav', {
			pages: 'pages',
			sidebars: ['sidebars', 'widgets'],
			posts: ['posts', 'post-categories'],
			faq: ['questions', 'question-categories'],
			users: 'users',
		});

		keystone.start();
	}
}

module.exports = Server;

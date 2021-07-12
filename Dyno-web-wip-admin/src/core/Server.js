'use strict';

const path = require('path');
const http = require('http');
const express = require('express');
const compression = require('compression');
const removeRoute = require('express-remove-route');
const flash = require('express-flash');
const exphbs = require('express-handlebars');
const session = require('express-session');
const bodyParser = require('body-parser');
const multer = require('multer');
const multerS3 = require('multer-s3');
const RedisStore = require('connect-redis')(session);
const S3 = require('aws-sdk/clients/s3');
const morgan = require('morgan');
const logger = require('./logger');
const config = require('./config');
const utils = require('./utils');
const compareHelper = require('../helpers/compare');
const ifArrayHelper = require('../helpers/ifArray');
const cookieParser = require('cookie-parser');
const fileType = require('file-type');
const reload = requireReload(require);

const s3 = new S3();

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

		// setup handlebars for view rendering
		app.engine('hbs', exphbs({
			extname: '.hbs',
			defaultLayout: 'main',
			partialsDir: path.join(config.paths.views, 'partials'),
			compilerOptions: {
				preventIndent: true,
			},
			helpers: {
				compare: compareHelper,
				ifArray: ifArrayHelper.ifArray,
				unlessArray: ifArrayHelper.unlessArray,
				dynamicPartial: (name) => name,
				toJSON: (object) => JSON.stringify(object),
			},
		}));

		app.set('view engine', 'hbs');
		app.enable('view cache');
		app.use(express.static(config.paths.public));
		app.use(bodyParser.json());
		app.use(bodyParser.urlencoded({ extended: true }));
		app.use(compression());
		// app.use(multer({ dest: config.paths.uploads }).single('photo'));
		app.use(flash());
		app.use(cookieParser());

		this.upload = multer({
			storage: multerS3({
				s3: s3,
				bucket: 'cdn.dyno.gg',
				acl: 'public-read',
				metadata: (req, file, cb) => {
					cb(null, { fieldName: file.fieldname });
				},
				key: (req, file, cb) => {
					const fileName = `${req.uploadDir}/${file.originalname}`;
					cb(null, fileName);
				},
			}),
		});

		this.memoryUpload = multer({
			storage: multer.memoryStorage(),
			fileFilter: (req, file, cb) => {
				try {
					if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
						return cb(new Error('Only JPEG/PNG files are allowed'));
					}

					if (file.mimetype !== 'image/png' && file.mimetype !== 'image/jpeg') {
						return cb(new Error('Only JPEG/PNG files are allowed'));
					}

					return cb(null, true);
				} catch (err) {
					return cb(err);
				}
			},
			limits: {
				// 1MB
				fileSize: 1000000,
				// Max 4 files per multipart request
				files: 4,
			},
		});

		if (!config.test) {
			app.use((req, res, next) => {
				res.header('Access-Control-Allow-Credentials', true);
				res.header('Access-Control-Allow-Origin', req.headers.origin);
				res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
				res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
				res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
				res.header('X-Frame-Options', 'SAMEORIGIN');
				res.header('X-Content-Type-Options', 'nosniff');
				res.header('X-XSS-Protection', '1; mode=block');
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
				ttl: 7 * 24 * 60 * 60, // 7 days
			}),
			cookie: {
				path: '/',
				maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
			},
		};

		if (!config.test) {
			sessionOpts.cookie.domain = process.env.SITE_COOKIE_DOMAIN || '.dynobot.net';
		}

		// create the session handler using mongodb
		app.use(session(sessionOpts));

		// disable powered by
		app.disable('x-powered-by');

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

		// app.use('/api/server/:id/serverlisting/update', formidable());
		// set template data
		// app.locals = {
		// 	site: {
		// 		title: config.site.title,
		// 		uuid: config.uuid,
		// 	},
		// 	externalStylesheets: [],
		// 	stylesheets: ['app'],
		// };

		// load controllers
		utils.readdirRecursive(config.paths.controllers).then(files => {
			files.forEach(file => {
				let Controller = require(file);
				if (!Controller || typeof Controller !== 'function') {
					return;
				}
				return this.createRoutes(new Controller(this.client));
			});
		});

		// create server
		http.createServer(app).listen(app.get('port'), () => {
			logger.info('Express server listening on port %d', app.get('port'));
		});
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

		const controller = new Controller(this.client);

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

				if (route.upload) {
					this.app[route.method](route.uri, route.handler.bind(route, this.client, this.upload));
				} else if (route.memoryUpload) {
					this.app[route.method](route.uri, route.handler.bind(route, this.client, this.memoryUpload));
				} else {
					this.app[route.method](route.uri, route.handler.bind(route, this.client));
				}

				continue;
			}

			for (let uri of route.uri) {
				if (route.method === 'use') logger.info(`Registering middleware for ${uri}`);
				else logger.info(`Creating route for ${uri}`);

				// create the express route
				this.app[route.method](uri, route.handler.bind(route, this.client));
			}
		}
	}
}

module.exports = Server;

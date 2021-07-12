const keystone = require('keystone');
const middleware = require('./middleware');
const config = require('./core/config');
const logger = require('./core/logger');
const utils = require('./core/utils');

// Common Middleware
keystone.pre('routes', middleware.initLocals);
keystone.pre('render', middleware.flashMessages);

class Routes {
	constructor(app, client) {
		this.app = app;
		this.client = client;

		// load controllers
		utils.readdirRecursive(config.paths.controllers).then(files => {
			const controllers = [];
			const loadAfterControllers = [];

			files.forEach(file => {
				const Controller = require(file);
				const controller = new Controller(this.client);
				if (controller.loadAfter) {
					loadAfterControllers.push(controller);
				} else {
					controllers.push(controller);
				}
			});

			controllers.forEach(controller => this.createRoutes(controller));
			loadAfterControllers.forEach(controller => this.createRoutes(controller));
		});
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
				this.app[route.method](route.uri, route.handler.bind(route, this.client));
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

// Setup Route Bindings
exports = module.exports = (app, client) => {
	return new Routes(app, client);
};

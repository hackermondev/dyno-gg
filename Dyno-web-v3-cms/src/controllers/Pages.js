'use strict';

const keystone = require('keystone');
const each = require('async-each');
const Controller = require('../core/Controller');

/**
 * Pages controller
 * @class Pages
 * @extends {Controller}
 */
class Pages extends Controller {

   /**
	* Constructor
	* @returns {Object}
	*/
   constructor(bot) {
		super(bot);

		// define routes
		return {
			pages: {
				method: 'get',
				uri: '/:page',
				// handler: () => false,
				handler: this.page.bind(this),
			},
		};
	}

	get loadAfter() {
		return true;
	}

	page(bot, req, res) {
		const view = new keystone.View(req, res);
		const locals = res.locals;

		locals.section = 'page';
		// locals.data = {
		// 	questions: [],
		// 	categories: [],
		// };
		locals.stylesheets.push('page');

		// Load the current category filter
		view.on('init', next => {
			keystone.list('Page').model
				.findOne({ slug: req.params.page })
				.populate('sidebar')
				.deepPopulate('sidebar.widgets')
				.exec((err, result) => {
					if (!result) {
						return next(err);
					}

					locals.page = result;

					switch (result.heroType) {
						case 'small':
							locals.page.heroSmall = true;
							break;
						case 'small-left':
							locals.page.heroSmall = true;
							locals.page.heroLeft = true;
							break;
						case 'expanded':
							locals.page.heroLarge = true;
							break;
					}

					next(err);
				});
		});

		view.render('keystone/page');
	}
}

module.exports = Pages;

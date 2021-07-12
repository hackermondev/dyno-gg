'use strict';

const keystone = require('keystone');
const each = require('async-each');
const Controller = require('../core/Controller');

/**
 * FAQ controller
 * @class FAQ
 * @extends {Controller}
 */
class FAQ extends Controller {

   /**
	* Constructor
	* @returns {Object}
	*/
   constructor(bot) {
		super(bot);

		// define routes
		return {
			faq: {
				method: 'get',
				uri: '/faq/:category?',
				handler: this.faq.bind(this),
			},
		};
	}

	faq(bot, req, res) {
		const view = new keystone.View(req, res);
		const locals = res.locals;

		locals.section = 'faq';
		locals.defaultCategory = 'General';
		locals.filters = {
			category: req.params.category || locals.defaultCategory.toLowerCase(),
		};
		locals.data = {
			questions: [],
			categories: [],
		};
		locals.stylesheets.push('faq');

		// Load sidebar
		view.on('init', next => {
			keystone.list('Sidebar').model
				.findOne({ name: 'FAQ' })
				.populate('widgets')
				.exec((err, result) => {
					locals.sidebar = result;
					next(err);
				});
		});

		// Load all categories
		view.on('init', next => {
			keystone.list('QuestionCategory').model
				.find()
				.sort('name')
				.exec((err, results) => {
					if (err || !results.length) {
						return next(err);
					}

					locals.data.categories = results;

					// Load the counts for each category
					each(locals.data.categories, (category, next) => {
						keystone.list('Question').model
							.count()
							.where('category')
							.in([category.id])
							.exec((err, count) => {
								category.questionCount = count;
								next(err);
							});
					}, err => {
						next(err);
					});
				});
		});

		// Load the current category filter
		view.on('init', next => {
			keystone.list('QuestionCategory').model
				.findOne({ key: locals.filters.category })
				.exec((err, result) => {
					locals.category = result.name;
					locals.data.category = result;
					next(err);
				});
		});

		// Load the questions
		view.on('init', next => {
			const q = keystone.list('Question').paginate({
					page: req.query.page || 1,
					perPage: 10,
					maxPages: 10,
					filters: {
						state: 'published',
					},
				})
				.populate('author category');

			if (locals.data.category) {
				q.where('category').in([locals.data.category]);
			}

			q.exec((err, results) => {
				locals.data.questions = results;
				next(err);
			});
		});

		// Render the view
		view.render('keystone/faq');
	}
}

module.exports = FAQ;

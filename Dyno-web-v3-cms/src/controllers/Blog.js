'use strict';

const keystone = require('keystone');
const each = require('async-each');
const Controller = require('../core/Controller');

/**
 * Blog controller
 * @class Blog
 * @extends {Controller}
 */
class Blog extends Controller {

   /**
	* Constructor
	* @returns {Object}
	*/
   constructor(bot) {
		super(bot);

		// define routes
		return {
			blog: {
				method: 'get',
				uri: '/blog/:category?',
				handler: this.blog.bind(this),
			},
			post: {
				method: 'get',
				uri: '/blog/post/:post',
				handler: this.post.bind(this),
			},
		};
	}

	blog(bot, req, res) {
		const view = new keystone.View(req, res);
		const locals = res.locals;

		// Init locals
		locals.section = 'blog';
		locals.filters = {
			category: req.params.category,
		};
		locals.data = {
			posts: [],
			categories: [],
		};

		// Load all categories
		view.on('init', next => {
			keystone.list('PostCategory').model
				.find()
				.sort('name')
				.exec((err, results) => {
					if (err || !results.length) {
						return next(err);
					}

					locals.data.categories = results;

					// Load the counts for each category
					each(locals.data.categories, (category, next) => {
						keystone.list('Post').model
							.count()
							.where('categories')
							.in([category.id])
							.exec((err, count) => {
								category.postCount = count;
								next(err);
							});
					}, err => {
						next(err);
					});
				});
		});

		// Load the current category filter
		view.on('init', next => {
			if (req.params.category) {
				keystone.list('PostCategory').model
					.findOne({ key: locals.filters.category })
					.exec((err, result) => {
						locals.data.category = result;
						next(err);
					});
			} else {
				return next();
			}
		});

		// Load the posts
		view.on('init', next => {
			const q = keystone.list('Post').paginate({
				page: req.query.page || 1,
				perPage: 10,
				maxPages: 10,
				filters: {
					state: 'published',
				},
			})
				.sort('-publishedDate')
				.populate('author categories');

			if (locals.data.category) {
				q.where('categories').in([locals.data.category]);
			}

			q.exec((err, results) => {
				locals.data.posts = results;
				next(err);
			});
		});

		// Render the view
		view.render('keystone/blog');
	}

	post(bot, req, res) {
		const view = new keystone.View(req, res);
		const locals = res.locals;

		// Set locals
		locals.section = 'blog';
		locals.filters = {
			post: req.params.post,
		};
		locals.data = {
			posts: [],
		};

		// Load the current post
		view.on('init', (next) => {
			const q = keystone.list('Post').model
				.findOne({
					state: 'published',
					slug: locals.filters.post,
				})
				.populate('author categories');

			q.exec((err, result) => {
				locals.data.post = result;
				next(err);
			});
		});

		// Load other posts
		view.on('init', (next) => {
			const q = keystone.list('Post').model
				.find()
				.where('state', 'published')
				.sort('-publishedDate')
				.populate('author')
				.limit('4');

			q.exec((err, results) => {
				locals.data.posts = results;
				next(err);
			});
		});

		// Render the view
		view.render('keystone/post');
	}
}

module.exports = Blog;
const Controller = require('../core/Controller');
const seedrandom = require('seedrandom');
const db = require('../core/models');
const ObjectId = require('mongoose').Types.ObjectId;
const axios = require('axios');
const config = require('../core/config').site;

/**
 * Bar controller
 * @class Bar
 * @extends {Controller}
 */
class ServerList extends Controller {
	/**
	 * Constructor
	 * @returns {Object}
	 */
	constructor(bot, httpServer) {
		super(bot);

		this.httpServer = httpServer;
		this.servers = [];
		this.serversByCategories = {};

		this.fetchAndCategorize();
		setInterval(() => { this.fetchAndCategorize(); }, 5 * 60 * 1000);

		// define routes
		return {
			index: {
				method: 'get',
				uri: '/serverlisting/',
				handler: this.getServers.bind(this),
			},
			getServer: {
				method: 'get',
				uri: '/serverlisting/server/:id',
				handler: this.getServer.bind(this),
			},
			getInviteUrl: {
				method: 'get',
				uri: '/serverlisting/server/:id/inviteUrl/:token',
				handler: this.getInviteUrl.bind(this),
			},
			search: {
				method: 'get',
				uri: '/serverlisting/search/:query',
				handler: this.search.bind(this),
			},
			getCategories: {
				method: 'get',
				uri: '/serverlisting/getCategories/',
				handler: this.getCategories.bind(this),
			}
		};
	}

	async fetchAndCategorize() {
		const projection = {
			id: 1,
			categories: 1,
			memberCount: 1,
			name: 1,
		};
		const coll = db.collection('serverlist_store');

		const serversFetched = await coll.find({ listed: true }, projection).sort({ memberCount: -1 }).toArray();
		this.httpServer.sitemap.updateServers(serversFetched);

		this.servers = [];
		this.serversByCategories = [];

		this.servers.push(...serversFetched);

		this.servers.forEach((s) => {
			if (!s.categories) {
				return;
			}

			s.categories.forEach((cat) => {
				cat = cat.replace(' ', '_').toLowerCase();
				this.serversByCategories[cat] = this.serversByCategories[cat] || [];
				this.serversByCategories[cat].push(s);
			});
		});
	}

	async search(bot, req, res) {
		try {
			const query = req.params.query;
			const skip = parseInt(req.query.skip) || 0;
			const sort = req.query.sort;
			const limit = 12;
			const category = req.query.category;

			let queryObj = {
				$text:
				{
					$search: query,
					$caseSensitive: false,
				},
				listed: true,
			};

			if (category) {
				queryObj.categories = category;
			}

			let sortObj = {
				score: { $meta: 'textScore' },
			};

			if (sort === 'memberCount') {
				sortObj = {
					memberCount: -1,
				};
			} else {
				sortObj = {
					score: { $meta: 'textScore' },
				};
			}

			const coll = db.collection('serverlist_store');

			const result = await coll.find(queryObj)
			.project({ score: { $meta: 'textScore' } })
			.sort(sortObj)
			.skip(skip)
			.limit(limit)
			.toArray();

			res.send({ servers: result });
		} catch (err) {
			res.status(500).send(err.message);
		}
	}

	async getCategories(bot, req, res) {
		const coll = db.collection('serverlist_categories');

		const cats = await coll.find({}).toArray();

		let catInfo = cats.map((c) => {
			const ret = {};

			ret.fullName = c.name;
			ret.keyName = c.name.replace(' ', '_').toLowerCase();
			ret.serverCount = 0;

			if (this.serversByCategories && this.serversByCategories[ret.keyName] && this.serversByCategories[ret.keyName].length) {
				ret.serverCount = this.serversByCategories[ret.keyName].length;
			}

			return ret;
		});

		catInfo = catInfo.sort((a, b) => {
			return b.serverCount - a.serverCount;
		});

		res.send({ categoriesInfo: catInfo });
	}

	setCookie(res, indexedDoc, type, seed) {
		let cookieValue = {
			seed,
		};

		cookieValue[type] = {
			objectId: indexedDoc._id,
			createdAt: indexedDoc.createdAt,
		};

		res.cookie(
			`serverlisting_${type}`,
			cookieValue,
			{
				maxAge: 30 * 60 * 1000,
			}
		);
	}

	async getIndexedDoc(type, cookie) {
		// 2 hours
		const indexTtl = 2 * 60 * 60 * 1000;

		if (!type) {
			return;
		}

		const coll = db.collection(`serverlist_live_${type}`);
		const projection = { createdAt: 1, itemCount: 1, weightSum: 1, pageCount: 1 };

		if (!cookie[type]) {
			return (await coll.find({}, projection).sort({ createdAt: -1 }).limit(1).toArray())[0];
		}

		const objectId = cookie[type].objectId;
		const createdAt = cookie[type].createdAt;

		if (!objectId || !createdAt || (Date.now() - new Date(createdAt).getTime()) > indexTtl) {
			return (await coll.find({}, projection).sort({ createdAt: -1 }).limit(1).toArray())[0];
		}

		if (objectId) {
			const doc = await coll.findOne({ _id: new ObjectId(objectId) }, projection);

			if (!doc) {
				return (await coll.find({}, projection).sort({ createdAt: -1 }).limit(1).toArray())[0];
			}

			return doc;
		}
	}

	// Fisher-Yates (aka Knuth) Shuffle
	shuffleArr(array, rand) {
		var currentIndex = array.length, temporaryValue, randomIndex;

		// While there remain elements to shuffle...
		while (currentIndex !== 0) {
			// Pick a remaining element...
			randomIndex = Math.floor(rand() * currentIndex);
			currentIndex -= 1;

			// And swap it with the current element.
			temporaryValue = array[currentIndex];
			array[currentIndex] = array[randomIndex];
			array[randomIndex] = temporaryValue;
		}

		return array;
	}

	async getServerIds(type, page, cookie, rand) {
		const shuffle = (array) => this.shuffleArr(array, rand);

		const coll = db.collection(`serverlist_live_${type}`);

		const indexedDoc = await this.getIndexedDoc(type, cookie);

		// Randomize the page order of every page
		// BUT the last. Since the last one may contain
		// less entries.
		const pageIndexes = shuffle([...Array(indexedDoc.pageCount - 1).keys()]);
		// Ensure the last page is always the last page
		pageIndexes[indexedDoc.pageCount - 1] = indexedDoc.pageCount - 1;

		const pageId = pageIndexes[page];

		const queryResult = await coll.aggregate(
			[
				{ $match: { _id: new ObjectId(indexedDoc._id) } },
				{
					$project: {
						_id: 1,
						ids: { $arrayElemAt: ['$pages', pageId] },
					},
				},
			]).next();

		return {
			indexedDoc,
			ids: queryResult.ids,
		};
	}

	async getServersByCategory(category, page, limit, seed) {
		const coll = db.collection('serverlist_store');

		category = category.replace(' ', '_').toLowerCase();
		const servers = this.serversByCategories[category];

		if (!servers || servers.length === 0) {
			return {
				servers: [],
				pageCount: 1,
			};
		}

		let serversCopy = [...servers];
		if (seed) {
			serversCopy = this.shuffleArr(serversCopy, seedrandom(seed));
		}

		const pageCount = Math.floor(serversCopy.length / limit);

		const pageStart = page * limit;
		const pageEnd = (page * limit) + limit;

		const ids = serversCopy.slice(pageStart, pageEnd).map((s) => s.id);

		return {
			servers: await coll.find({ listed: true, id: { $in: Array.from(ids) } }, { inviteUrl: 0 }).sort({ memberCount: -1 }).toArray(),
			pageCount,
		};
	}

	async getServers(bot, req, res) {
		const page = req.query.page || 0;
		const type = req.query.type;
		const sort = req.query.sort || 'random';
		const category = req.query.category;

		const cookie = req.cookies[`serverlisting_${type}`] || {};

		if (!type || !['premium', 'regular', 'featured'].includes(type)) {
			res.status(500).send('Invalid type');
			return;
		}

		if (!sort || !['random', 'memberCount'].includes(sort)) {
			res.status(500).send('Invalid sort type');
			return;
		}

		if (category && type !== 'regular') {
			res.status(500).send('Invalid type/cat combo');
			return;
		}

		if (category) {
			let seed;
			if (sort && sort === 'random') {
				seed = req.query.seed || cookie.seed || 10777700 * (Math.random() * Math.random());
			}
			res.send(await this.getServersByCategory(category, page, 12, seed));
			return;
		}

		if (sort === 'memberCount') {
			try {
				let limit = 12;
				const filter = { listed: true };

				if (type === 'featured') {
					filter.featured = true;
					limit = 4;
				}

				if (type === 'premium') {
					filter.premium = true;
					limit = 3;
				}

				const skip = page * limit;

				const coll = db.collection('serverlist_store');

				const result = await coll.find(filter)
				.project({ inviteUrl: 0 })
				.sort({ memberCount: -1 })
				.skip(skip)
				.limit(limit)
				.toArray();

				const count = await coll.count(filter);

				res.send({
					servers: result,
					pageCount: Math.floor(count / limit),
				});
			} catch (err) {
				res.status(500).send(err.message);
			}
		} else if (sort === 'random') {
			try {
				const seed = req.query.seed || cookie.seed || 10777700 * (Math.random() * Math.random());

				const rand = seedrandom(seed);
				const shuffle = (array) => this.shuffleArr(array, rand);

				const coll = db.collection('serverlist_store');

				const ids = await this.getServerIds(type, page, cookie, rand);

				this.setCookie(res, ids.indexedDoc, type, seed);

				res.send({
					servers: shuffle(await coll.find({ listed: true, id: { $in: Array.from(ids.ids) } }, { inviteUrl: 0 }).toArray()),
					pageCount: ids.indexedDoc.pageCount,
				});
			} catch (e) {
				res.status(500).send(e.message);
			}
		}
	}

	async getServer(bot, req, res) {
		try {
			const id = req.params.id;

			if (!id) {
				res.status(500).send('No id specified');
				return;
			}

			if (!id.match(/^([0-9]+)$/)) {
				res.status(500).send('Invalid id');
				return;
			}

			const coll = db.collection('serverlist_store');

			const server = await coll.findOne({ id, listed: true });

			if (!server) {
				res.status(500).send('Server not found');
				return;
			}

			delete server.inviteUrl;

			res.send(server);
		} catch (err) {
			res.status(500).send(err.message);
		}
	}

	async getInviteUrl(bot, req, res) {
		try {
			const id = req.params.id;
			const token = req.params.token;

			if (!id) {
				res.status(500).send('No id specified');
			}

			if (!id.match(/^([0-9]+)$/)) {
				res.status(500).send('Invalid id');
			}

			const url = `https://www.google.com/recaptcha/api/siteverify?secret=${config.recaptcha_secret_key}&response=${token}&remoteip=${req.connection.remoteAddress}`;
			const recaptcha = await axios.post(url);

			if (!recaptcha.data.success) {
				res.status(500).send('Recaptcha failed verification');
				return;
			}

			const coll = db.collection('serverlist_store');

			const server = await coll.findOne({ id, listed: true }, { id: 1, inviteUrl: 1 });

			res.send(server.inviteUrl);

			const today = new Date();
			today.setHours(0, 0, 0, 0);

			var bulk = db.collection('serverlist_invitestats').initializeOrderedBulkOp();

			bulk.find({ id: id })
				.updateOne({ $inc: { inviteTotal: 1 } });

			// The trick here is: We try to increment the invite counter. It will fail
			// if the document for "today" doesn't exist and will carry on the bulk.
			// We also do an insert for the document. The $ne will ensure we only include the
			// document if it doesn't exist.
			// this trick prevents a roundtrip to the DB to check wether the document exists
			bulk.find({ id: id, 'dailyStats.date': today })
				.updateOne({ $inc: { 'dailyStats.$.invites': 1 } });

			bulk.find({ id: id, 'dailyStats.date': { $ne: today } })
				.updateOne({ $push: { dailyStats: { date: today, invites: 1 } } });

			bulk.execute();
		} catch (err) {
			res.status(500).send(err.message);
		}
	}
}

module.exports = ServerList;

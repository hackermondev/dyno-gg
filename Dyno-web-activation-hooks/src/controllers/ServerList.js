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
	constructor(bot) {
		super(bot);

		if (!process.env.ENABLE_SERVER_LISTING) {
			return {};
		}

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
		};
	}

	async search(bot, req, res) {
		try {
			const query = req.params.query;
			const skip = parseInt(req.query.skip) || 0;
			const limit = 20;

			const coll = db.collection('serverlist_store');

			const result = await coll.find({
				$text:
				{
					$search: query,
					$caseSensitive: false,
				},
				listed: true,
			})
			.project({ score: { $meta: 'textScore' } })
			.sort({ score: { $meta: 'textScore' } })
			.skip(skip)
			.limit(limit)
			.toArray();

			res.send({ servers: result });
		} catch (err) {
			res.status(500).send(err.message);
		}
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

	async getServers(bot, req, res) {
		const page = req.query.page || 0;
		const type = req.query.type;

		if (!type || !['premium', 'regular', 'featured'].includes(type)) {
			res.status(500).send('Invalid type');
		}

		try {
			const cookie = req.cookies[`serverlisting_${type}`] || {};
			const seed = req.query.seed || cookie.seed || 10777700 * (Math.random() * Math.random());

			const rand = seedrandom(seed);
			const shuffle = (array) => this.shuffleArr(array, rand);

			const coll = db.collection('serverlist_store');

			const ids = await this.getServerIds(type, page, cookie, rand);

			this.setCookie(res, ids.indexedDoc, type, seed);

			res.send({
				servers: shuffle(await coll.find({ listed: true, id: { $in: Array.from(ids.ids) } }, ).toArray()),
				pageCount: ids.indexedDoc.pageCount,
			});
		} catch (e) {
			res.status(500).send(e.message);
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

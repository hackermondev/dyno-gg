'use strict';

const Controller = require('../core/Controller');
const steamer = require('../helpers/Steamer.js');


class Steam extends Controller {

	/**
	 * Constructor
	 * @returns {Object}
	 */
	constructor() {
		super();

		// define routes
		return {
			ownedGames: {
				method: 'get',
				uri: '/api/v1/steam/ownedGames',
				handler: this.ownedGames.bind(this),
			},
			recentGames: {
				method: 'get',
				uri: '/api/v1/steam/recentGames',
				handler: this.recentGames.bind(this),
			},
			user: {
				method: 'get',
				uri: '/api/v1/steam/user',
				handler: this.user.bind(this),
			},
			gameNews: {
				method: 'get',
				uri: '/api/v1/steam/gameNews',
				handler: this.gameNews.bind(this),
			},
			game: {
				method: 'get',
				uri: '/api/v1/steam/game',
				handler: this.game.bind(this),
			}
		};
	}

	async ownedGames(req, res) {
		let steamID = req.query.SteamID;
		let APIToken = config.steam.token;

		if (!steamID) {
			return res.status(500).send("SteamID parameter required.");
		}

		let games = await steamer.ownedGames(SteamID, APIToken);
		return res.status(200).send(games);
	}

	async recentGames(req, res) {
		let steamID = req.query.SteamID;
		let APIToken = config.steam.token;

		if (!steamID) {
			return res.status(500).send("SteamID parameter required.");
		}

		let games = await steamer.recentGames(SteamID, APIToken);
		return res.status(200).send(games);
	}

	async user(req, res) {
		let steamID = req.query.SteamID;
		let APIToken = config.steam.token;

		if (!steamID) {
			return res.status(500).send("SteamID parameter required.");
		}

		let user = await steamer.user(SteamID, APIToken);
		return res.status(200).send(user);
	}
	async gameNews(req, res) {
		let appID = req.query.AppID;
		let APIToken = config.steam.token;

		if (!appID) {
			return res.status(500).send("AppID parameter required.");
		}

		let gameNews = await steamer.gameNews(appID, APIToken);
		return res.status(200).send(gameNews);
	}
	async game(req, res) {
		let appID = req.query.AppID;

		if (!appID) {
			return res.status(500).send("AppID parameter required.");
		}

		let game = await steamer.game(appID);
		return res.status(200).send(game);
	}



}

module.exports = Steam;

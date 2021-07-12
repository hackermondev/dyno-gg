const URL = require('url').URL;
const qs = require('qs');
const axios = require('axios');
const shortid = require('shortid');
const config = require('../config/config');

class AuthenticationController {
	static getOauthRedirect(req, res, next) {
		if (!config.discord) {
			return this._handleMissingConfig(res, next);
		}
		const redirectUrl = this._buildOauthUrl();
		res.redirect(redirectUrl.toString(), next);
	}

	static async getOauthCallback(req, res, next, User, tokenController) {
		if (!config.discord) {
			return this._handleMissingConfig(res, next);
		}
		if (req.query.error) {
			res.status(401);
			res.json({status: 401, message: req.query.error});
			return next();
		}
		if (!req.query.code) {
			res.status(401);
			res.json({status: 401, message: 'no code received'});
			return next();
		}
		try {
			const data = {
				// eslint-disable-next-line camelcase
				client_id: config.discord.client_id,
				// eslint-disable-next-line camelcase
				client_secret: config.discord.client_secret,
				// eslint-disable-next-line camelcase
				grant_type: 'authorization_code',
				code: req.query.code,
				// eslint-disable-next-line camelcase
				redirect_uri: config.discord.redirectUri
			};
			const oauthReq = await axios.post('https://discordapp.com/api/oauth2/token', qs.stringify(data));
			const user = await this._handleLogin(oauthReq.data, User);
			const freshTokenId = shortid.generate();
			user.set({tokenId: freshTokenId});
			await user.save();
			const token = await tokenController.generate(user.id, `${user.id}-${user.tokenId}`);
			res.status(200);
			res.json({token, id: user.id});
			return next();
		} catch (e) {
			console.log(e);
			res.status(401);
			res.json({status: 401, message: 'couldn\'t authenticate user'});
			return next();
		}
	}

	static async _handleLogin(oauthData, User) {
		const user = await this._getUserDiscord(oauthData.access_token);
		let botListUser = await User.find({where: {id: user.id}});
		if (botListUser) {
			return botListUser;
		}
		botListUser = await User.build({
			id: user.id,
			username: user.username,
			avatarUrl: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`,
			tokenId: '',
			lastAuth: new Date(),
			permissionlevel: 0
		});
		await botListUser.save();
		return botListUser;
	}

	static async _getUserDiscord(token) {
		const req = await axios.get('https://discordapp.com/api/v6/users/@me', {headers: {Authorization: `Bearer ${token}`}});
		if (req.data) {
			return req.data;
		}
	}

	static _handleMissingConfig(res, next) {
		res.status(500);
		res.json({status: 500, message: 'invalid config'});
		return next();
	}

	static _buildOauthUrl() {
		const redirectUrl = new URL('https://discordapp.com/api/oauth2/authorize');
		redirectUrl.searchParams.append('client_id', config.discord.client_id);
		redirectUrl.searchParams.append('response_type', config.discord.responseType);
		redirectUrl.searchParams.append('redirect_uri', config.discord.redirectUri);
		redirectUrl.searchParams.append('scope', config.discord.scopes.join(' '));
		return redirectUrl;
	}
}

module.exports = AuthenticationController;

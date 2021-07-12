const AuthenticationController = require('../controllers/authentication-controller');

module.exports = function (server, User, tokenController) {
	server.get('/api/oauth2/redirect', (req, res, next) => {
		AuthenticationController.getOauthRedirect(req, res, next);
	});

	server.get('/api/oauth2/callback', (req, res, next) => {
		AuthenticationController.getOauthCallback(req, res, next, User, tokenController);
	});
};

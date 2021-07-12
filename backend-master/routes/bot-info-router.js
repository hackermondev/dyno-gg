const BotInfoController = require('../controllers/bot-info-controller');

module.exports = function (server, Bot) {
	server.get('/api/bots', (req, res, next) =>
		BotInfoController.getBots(req, res, next, Bot)
	);
	server.get('/api/bots/:id', (req, res, next) => {
		BotInfoController.getBotById(req, res, next, Bot);
	});

	server.post('/api/bots', (req, res, next) =>
		BotInfoController.createBot(req, res, next, Bot)
	);
	return server;
};

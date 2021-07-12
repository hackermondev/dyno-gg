class BotInfoController {
	static async getBots(req, res, next, Bot) {
		try {
			const limit = parseInt(req.params.limit, 10) || 10;
			const offset = parseInt(req.params.offset, 10) || 0;

			if (limit < 1 || limit > 50) {
				res.status(400);
				return res.json({
					message: 'limit must be a number from 1 to 50'
				});
			}

			const bots = await Bot.findAll({limit, offset});
			res.json({
				bots
			});
		} catch (error) {
			console.error(error);
			res.status(500);
			res.json({
				message: 'Internal error'
			});
		}

		return next();
	}

	static async getBotById(req, res, next, Bot) {
		try {
			const bot = await Bot.find({where: {id: req.params.id}});
			if (bot) {
				res.json(bot);
			} else {
				res.status(404);
				res.json({message: 'This bot does not exist'});
			}
		} catch (error) {
			console.error(error);
			res.status(500);
			res.json({
				message: 'Internal error'
			});
		}
		return next();
	}

	static async createBot(req, res, next, Bot) {
		if (!req.body || !req.body.id) {
			res.status(400);
			res.json({
				message: 'Invalid bot data'
			});
			return next();
		}
		try {
			if (await Bot.findOne({where: {id: req.body.id}})) {
				res.status(400);
				res.json({
					message: 'Bot already added'
				});
				return next();
			}

			const newBot = await Bot.build({
				id: req.body.id,
				owners: req.body.owners,
				editors: req.body.editors,
				tags: req.body.tags || [],
				websiteUrl: req.body.website,
				prefix: req.body.prefix,
				inviteUrl: req.body.invite,
				descriptionShort: req.body.descriptionShort,
				descriptionLong: req.body.descriptionLong,
				votes: 0
			});

			try {
				await newBot.validate();
			} catch (validationError) {
				const userFriendlyErrors = validationError.errors.map(error => ({
					field: error.path,
					message: error.message,
					value: error.value
				}));

				res.status(400);
				res.json({
					message: 'Invalid bot data',
					errors: userFriendlyErrors
				});
				return next();
			}

			await newBot.save();

			res.status(201);
			res.json({
				message: 'Bot added'
			});
		} catch (error) {
			console.error(error);
			res.status(500);
			res.json({
				message: 'Internal error'
			});
		}

		return next();
	}
}

module.exports = BotInfoController;

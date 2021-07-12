module.exports = async function (req, res, next, whitelist, User, tokenController) {
	if (req.route.path) {
		for (const item of whitelist) {
			if (checkMatch(req, item)) {
				return next();
			}
		}
	}
	if (!req.headers || !req.headers.authorization) {
		return _unauthorized(res, next);
	}
	const authHeader = req.headers.authorization;
	if (authHeader.startsWith('Bearer ')) {
		const token = authHeader.split('Bearer ')[1];
		if (token === '') {
			return _unauthorized(res, next);
		}
		const decodedToken = Buffer.from(token, 'base64')
			.toString();
		const userId = decodedToken.split(':')[0];
		const account = await User.findOne({where: {id: userId}});
		if (!account) {
			return _unauthorized(res, next);
		}
		if (account.tokenId) {
			const verified = tokenController.verify(decodedToken.split(':')[1], `${account.id}-${account.tokenId}`);
			if (verified) {
				req.account = account;
				return next();
			}
		}
		return _unauthorized(res, next);
	}
};

function checkMatch(req, item) {
	return (item.pattern.match(req.route.path.toLowerCase()) && req.method.toLowerCase() === item.method) || item.method === 'all';
}

function _unauthorized(res, next) {
	res.status(401);
	res.json({message: 'unauthorized'});
	return next(false);
}

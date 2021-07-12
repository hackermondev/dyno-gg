const express = require('express')
const router = express.Router();
const ytdl = require('ytdl-core')

router.get('/', async function(req, res) {
	try {
		const info = await ytdl.getInfo(req.query.url);
		res.json(info)
	} catch (err) {
		return res.status(500).send(err);
	}
});

module.exports = router;
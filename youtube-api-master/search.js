const express = require('express')
const router = express.Router();
const Promise = require('bluebird')
const YouTube = require('youtube-node');
const yt = Promise.promisifyAll(new YouTube());

yt.setKey(process.env.API_KEY);

router.get('/', async function(req, res) {
    yt.addParam('type', 'video');
    
    try {
        const result = await yt.searchAsync(req.query.q, req.query.limit || 10);
        res.json(result);
    } catch (err) {
        res.status(500).send(err);
    }
});


module.exports = router;
const EventEmitter = require('events').EventEmitter;
const axios = require('axios');
const url = require('url');
const config = require('../config.json');
const crypto = require('crypto');

class Webhooks extends EventEmitter {
    constructor(app, models) {
        super();
        this.app = app;
        this.models = models;

        this.start();
    }

    start() {

        this.app.post('/twitch/live', this.twitch.bind(this));

        this.app.get('/twitch/live', this.twitchVerify.bind(this));
    }

    twitch(req, res) {
        let header = req.get('x-hub-signature');
        let hash = crypto.createHmac(header, config.twitch.secret)
            .update(JSON.stringify(req.body))
            .digest('hex');

        if (hash === header) {
            this.emit('twitch', req.body);
            return res.status(202);
        }
        
        return res.status(401).end();
    }

    twitchVerify(req, res) {
        if (req.query && req.query.challenge && req.query.mode === 'subscribe') {

            let data = url.parse(req.query.topic);

            let userID = data.query.user_id;

            let user = await axios.get(`https://api.twitch.tv/helix/users?id=${userID}`);

            let streamSubscription = await this.models.StreamSubscription.create({
                service: 'twitch',
                handle: user.login,
                id: user.id,
                lastSub: new Date()
            });

            // TODO: Add subscription renewal

            return res.send(req.query.challenge);
        } else {
            return res.status(200);
        }
    }
}

module.exports = Webhooks;
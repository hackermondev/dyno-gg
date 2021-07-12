const EventEmitter = require('events').EventEmitter;
const axios = require('axios');
const url = require('url');
const config = require('../config.json');
const crypto = require('crypto');

class Webhooks extends EventEmitter {
    constructor(app, models, manager) {
        super();
        this.app = app;
        this.models = models;
        this.manager = manager;

        this.start();
    }

    start() {

        this.app.post('/twitch/live/:id', this.twitch.bind(this));

        this.app.get('/twitch/live/:id', this.twitchVerify.bind(this));
    }

    twitch(req, res) {
        let userID = req.params.id;
        let header = req.get('X-Hub-Signature').split('=');
        let hash = crypto.createHmac(header[0], config.twitch.webhookSecret)
            .update(JSON.stringify(req.body))
            .digest('hex');

        if (hash === header[1]) {
            let isLive = req.body.data.length > 0 ? true : false;

            this.emit('twitch', req.body.data[0], userID, isLive);
            return res.status(202).end();
        }

        return res.status(401).end();
    }

    async twitchVerify(req, res) {

        if (req.query && req.query['hub.challenge'] && req.query['hub.mode'] === 'subscribe') {

            let userID = req.params.id;

            let res1;

            try {
                res1 = await axios.get(`https://api.twitch.tv/helix/users?id=${userID}`, {
                    headers: {
                        'Authorization': `Bearer ${this.manager.twitchAccess}`
                    }
                });
            } catch (e) {
                console.log(e);
            }

            let user = res1.data.data[0];

            let subscription = await this.models.StreamSubscription.findOne({ id: user.id });

            if (subscription) {
                subscription.lastSub = new Date();

                subscription.save();
            } else {
                this.models.StreamSubscription.create({
                    service: 'twitch',
                    handle: user.login,
                    id: user.id,
                    lastSub: new Date()
                });
            }

            console.log(`Registered subscription for ${user.login}`);

            return res.send(req.query['hub.challenge']);
        } else if (req.query && req.query['hub.mode'] === 'denied') {
            console.log(`Subscription denied for ${req.params.id}`);
        } else {
            await this.models.StreamSubscription.remove({
                service: 'twitch',
                id: req.params.id
            });
            console.log(`Deleted subscription for ${req.params.id}`);
            return res.status(200).end();
        }
    }
}

module.exports = Webhooks;
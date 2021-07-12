const axios = require('axios');
const config = require('../config.json');

class Alerts {
    constructor(app, models) {
        this.app = app;
        this.models = models;

        this.start();
    }

    start() {

        this.app.post('/streams/add/twitch', this.addTwitchAlert.bind(this));

        this.app.post('/streams/remove/twitch', this.removeTwitchAlert.bind(this));
    }

    async addTwitchAlert(req, res) {
        let handle = req.body.handle;

        if (!handle) {
            return res.status(400).send({ error: 'No handle provided' });
        }

        let subscription = await this.models.StreamSubscription.findOne({
            service: 'twitch',
            handle: handle
        });

        if (!subscription) {
            try {
                let user = await axios.get(`https://api.twitch.tv/helix/users?login=${handle}`);
            } catch (e) {
                console.log(e);
            }

            if (!user) {
                return res.status(400).send({ error: 'Invalid handle' });
            }

            axios.post('https://api.twitch.tv/helix/webhooks/hub', {
                callback: config.twitch.callback,
                mode: 'subscribe',
                topic: `https://api.twitch.tv/helix/streams?user_id=${user.id}`,
                lease_seconds: 864000,
                secret: config.twitch.secret
            });
        }

        let data = {};

        ['channel', 'guild', 'webhook'].forEach(item => {
            if (req.body[item]) {
                data[item] = item;
            } else {
                return req.status(400).send({ error: `Missing ${item}` });
            }
        });

        let alert = await this.models.StreamAlert.create({
            service: 'twitch',
            handle: handle,
            channel: data.channel,
            guild: data.guild,
            webhook: data.webhook
        });

        return res.status(200).end();
    }

    async removeTwitchAlert(req, res) {
        let handle = req.body.handle;
        let channel = req.body.channel;


        if (!handle) {
            return res.status(400).send({ error: 'No handle provided' });
        }

        if (!channel) {
            return res.status(400).send({ error: 'No channel provided' });
        }

        let deletedAlert = await this.models.StreamAlert.remove({
            service: 'twitch',
            handle: handle,
            channel: channel
        });

        if (!deletedAlert) {
            return res.status(400).send({ error: 'Invalid handle' });
        }

        let subCount = this.models.StreamAlert.count({
            service: 'twitch',
            handle: handle
        });

        if (subCount === 0) {

            try {
                let user = await axios.get(`https://api.twitch.tv/helix/users?login=${handle}`);
            } catch (e) {
                console.log(e);
            }

            axios.post('https://api.twitch.tv/helix/webhooks/hub', {
                callback: 'https://streams.dyno.gg/twitch/live',
                mode: 'unsubscribe',
                topic: `https://api.twitch.tv/helix/streams?user_id=${user.id}`
            });

            let deletedSub = await this.models.StreamSubscription.remove({
                service: 'twitch',
                id: user.id,
                handle: handle
            });
        }

        return res.status(200).end();
    }
}

module.exports = Alerts;
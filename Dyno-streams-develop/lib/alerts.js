const axios = require('axios');
const config = require('../config.json');

class Alerts {
    constructor(app, models, manager) {
        this.app = app;
        this.models = models;
        this.manager = manager;

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

            let res1;

            try {
                res1 = await axios.get(`https://api.twitch.tv/helix/users?login=${handle}`, {
                    headers: {
                        'Authorization': `Bearer ${this.manager.twitchAccess}`
                    }
                });
            } catch (e) {
                console.log(e);
            }

            let user = res1.data.data[0];

            if (!user) {
                return res.status(400).send({ error: 'Invalid handle' });
            }

            let time = 864000;

            try {
                console.log(`Subscring to ${handle}`);
                await axios.post(`https://api.twitch.tv/helix/webhooks/hub?hub.callback=${config.twitch.callback}/${user.id}&hub.mode=subscribe&hub.topic=https://api.twitch.tv/helix/streams?user_id=${user.id}&hub.lease_seconds=${time}&hub.secret=${config.twitch.webhookSecret}`,
                    {}, {
                        headers: {
                            'Authorization': `Bearer ${this.manager.twitchAccess}`
                        }
                    });
            } catch (e) {
                console.log(e);
                return res.status(400).send('Could not create subscription');
            }
        }

        let data = {};

        ['channel', 'guild'].forEach(item => {
            if (req.body[item]) {
                data[item] = req.body[item];
            } else {
                return req.status(400).send({ error: `Missing ${item}` });
            }
        });

        let alertExists = await this.models.StreamAlert.findOne({ guild: data.guild, channel: data.channel, service: 'twitch', handle: handle });

        if (alertExists) return res.status(200).send('Alert already exists');

        try {
            await this.models.StreamAlert.create({
                service: 'twitch',
                handle: handle,
                channel: data.channel,
                guild: data.guild,
                webhook: data.webhook
            });
        } catch (e) {
            return res.status(500).send('Could not create alert')
        }

        console.log(`Alert created for ${handle}`);

        return res.status(201).end('Alert created');
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

        let deletedAlert;

        try {
            deletedAlert = await this.models.StreamAlert.remove({
                service: 'twitch',
                handle: handle,
                channel: channel
            });
        } catch (e) {
            return res.status(500).send('Could not delete alert')
        }

        if (!deletedAlert) {
            return res.status(400).send({ error: 'Invalid handle' });
        }

        console.log(`Deleted alert for ${handle}`);

        let subCount = await this.models.StreamAlert.count({
            service: 'twitch',
            handle: handle
        });

        if (subCount === 0) {

            let res1;

            try {
                res1 = await axios.get(`https://api.twitch.tv/helix/users?login=${handle}`, {
                    headers: {
                        'Authorization': `Bearer ${this.manager.twitchAccess}`
                    }
                });
            } catch (e) {
                console.log(e);
            }

            let user = res1.data.data[0];

            if (!user) {
                return res.status(400).send({ error: 'Invalid handle' });
            }

            let res2;

            try {
                res2 = await axios.post(`https://api.twitch.tv/helix/webhooks/hub?hub.callback=${config.twitch.callback}/${user.id}&hub.mode=unsubscribe&hub.topic=https://api.twitch.tv/helix/streams?user_id=${user.id}&hub.secret=${config.twitch.webhookSecret}`,
                    {}, {
                        headers: {
                            'Authorization': `Bearer ${this.manager.twitchAccess}`
                        }
                    });

            } catch (e) {
                console.log(e);
            }
        }

        return res.status(200).end();
    }
}

module.exports = Alerts;
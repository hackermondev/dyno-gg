const axios = require('axios');
const SnowTransfer = require('snowtransfer');
const Logger = require('./logger');
const logger = new Logger();
const utils = require('util');
const Queue = require('./queue.js');
const Webhooks = require('./webhooks');
const Alerts = require('./alerts');
const config = require('../config.json');
const express = require('express');
const bodyParser = require('body-parser');



class StreamService {
    constructor() {
        this.logger = logger;
        this.queues = {};
        this.mixerAlerts = [];
        this.smashAlerts = [];
        this.hexes = {
            twitch: '0x336fd5',
            smash: '0x336fd5',
            mixer: '0x336fd5'
        };

        this.urls = {
            twitch: 'https://static-cdn.jtvnw.net/jtv_user_pictures/twitch-profile_image-8a8c5be2e3b64a9a-300x300.png'
        };
    }

    async start() {

        let configValid = this.verifyConfig();

        if (!configValid) return;

        this.models = require('./models');


        this.client = new SnowTransfer(config.token, {
            baseHost: config.gate
        });

        await this.createTwitchAccess();

        let counter = 0;
        setInterval(() => {
            if (++counter >= 40) {
                this.createTwitchAccess();
                counter = 0;
            }
        }, 60 * 60 * 24 * 1000);

        this.setupAPI();

        setInterval(async () => {
            let currentTime = new Date();
            let needToReSub = await this.models.StreamSubscription.find({ lastSub: { $gte: currentTime - ((864000 - 86400) * 1000) } });

            if (needToReSub && needToReSub.length > 0) {
                for (let sub of needToReSub) {
                    await axios.post(`https://api.twitch.tv/helix/webhooks/hub?hub.callback=${config.twitch.callback}/${sub.id}&hub.mode=subscribe&hub.topic=https://api.twitch.tv/helix/streams?user_id=${sub.id}&hub.lease_seconds=864000&hub.secret=${config.twitch.webhookSecret}`,
                        {}, {
                            headers: {
                                'Authorization': `Bearer ${this.manager.twitchAccess}`
                            }
                        });
                }
            }
        }, 1000 * 60 * 60 * 8);

        /*  this.queues.smash = new Queue({
              interval: 1000 * 5,
              reqPerInterval: 1,
              service: 'smash'
          });
          this.queues.mixer = new Queue({
              interval: 1000 * 5,
              reqPerInterval: 1,
              service: 'mixer'
          });*/

        this.listenToEvents();

        /*  setInterval(() => {
              this.poll();
          }, 1000 * 60 * .25);*/

    }

    verifyConfig() {
        let valid = {};

        valid.gate = config.gate ? true : false;
        valid.token = config.token ? true : false;
        valid.apiToken = config.apiToken ? true : false;
        valid.callback = config.twitch && config.twitch.callback ? true : false;
        valid.mongo = config.mongo && config.mongo.url ? true : false;
        valid.secret = config.twitch && config.twitch.secret ? true : false;
        valid.webhookSecret = config.twitch && config.twitch.webhookSecret ? true : false;
        valid.clientID = config.twitch && config.twitch.clientID ? true : false;

        let isValid = true;

        for (let k in valid) {
            if (!valid[k]) {
                isValid = false;
                console.error(`${k} is invalid.`);
            }
        }

        return isValid;
    }

    listenToEvents() {
        let queues = Object.values(this.queues);
        for (let item of queues) {
            item.on('process', (item) => {
                switch (item.service) {
                    case 'mixer':
                        this.handleMixer(item.request)
                        break;
                    case 'smash':
                        this.handleSmashcast(item.request)
                        break;
                }
            });
        }

        this.webhooks.on('twitch', (...params) => {
            this.handleTwitch(...params);
        });
    }

    async createTwitchAccess() {

        let res;

        try {
            res = await axios.post(`https://id.twitch.tv/oauth2/token?client_id=${config.twitch.clientID}&client_secret=${config.twitch.secret}&grant_type=client_credentials`);
        } catch (e) {
            console.log(e);
        }

        if (!res) return console.error('Couldn\'t get access token');

        let data = res.data;

        this.twitchAccess = data.access_token

        return;
    }

    setupAPI() {
        this.app = express();

        this.app.use(bodyParser.json());

        this.webhooks = new Webhooks(this.app, this.models, this);

        this.alerts = new Alerts(this.app, this.models, this);

        this.app.post('/streams/*', (req, res, next) => {
            let token = req.get('Authorization');

            if (token !== config.apiToken) {
                return res.status(401).end();
            }

            next();
        });

        this.app.listen(config.port || 8050);

    }

    async poll() {
        /* await this.getAlerts('smash');
         await this.getAlerts('mixer');
 
         this.getSmashcast()
             .catch(err => logger.error(err));
 
         this.getMixer()
             .catch(err => logger.error(err));*/
    }

    async getAlerts(service) {
        let alerts = await this.models.StreamAlert.find({
            service: service
        }).lean().exec();
        this[`${service}Alerts`] = alerts;
    }

    updateStatus(handle, service, status) {
        this.models.StreamAlert.update({ service: service, handle: handle }, { $set: { streaming: status } }, { multi: true })
            .catch(err => this.logger.error(err));
    }

    async postStream(stream, service, alert) {
        if (!stream) return;

        let color = this.hexes[service];
        let serviceURL = this.urls[service];

        let embed = {
            description: `**[${stream.name} is now live on ${stream.service}!](${stream.url})**\n${stream.title}`,
            color: parseInt(color),
            timestamp: stream.startedAt,
            footer: {
                icon_url: serviceURL,
                text: 'Stream started'
            },
            image: {
                url: stream.image
            },
            thumbnail: {
                url: stream.logo
            },
            fields: [
                {
                    name: 'Playing:',
                    value: stream.game
                }
            ],
            author: {
                name: stream.name,
                url: stream.url,
                icon_url: stream.logo
            }
        }

        let embeds = [];
        embeds.push(embed);

        let webhook = await this.getOrCreateWebhook(alert.channel);

        try {
            this.client.webhook.executeWebhook(webhook.id, webhook.token, { embeds });
        } catch (e) {
            throw new Error(utils.inspect(e));
        }
    }

    async getOrCreateWebhook(channelID) {
        let webhooks = await this.client.webhook.getWebhooksChannel(channelID);

        if (webhooks.length > 0) {
            let dynoWebhook = webhooks.find(hook => hook.name === 'Dyno');
            if (dynoWebhook) {
                return dynoWebhook;
            }
        }

        return await this.client.webhook.createWebhook(channelID, {
            name: 'Dyno',
            avatar: config.webhookAv
        });
    }

    async postStreams(data, service) {
        if (!data) return;

        const { alerts, streams } = data;
        for (let stream of streams) {
            let alerts1 = alerts.filter(a => a.handle === stream.name);
            for (const alert of alerts1) {
                this.postStream(stream, service, alert);
            }
        }
    }

    logic(alerts, streams, service) {
        let alertSet = [];
        alerts.forEach(a => {
            let alert = alertSet.find(i => i.handle === a.handle);
            if (!alert) {
                alertSet.push(a);
            }
        });

        for (let alert of alertSet) {
            let stream = streams.find(s => s.name === alert.handle);
            if (stream) {
                if (alert.streaming) {

                    let deleteAlerts = alerts.filter(a => a.handle === alert.handle);
                    deleteAlerts.forEach(a => {
                        let aa = alerts.find(aaa => aaa.guild === a.guild);
                        let index = alerts.indexOf(aa);
                        alerts.splice(index);
                    });
                    let streamIndex = streams.indexOf(stream);
                    streams.splice(streamIndex);
                } else {
                    this.updateStatus(alert.handle, service, true);
                }
            } else {
                if (alert.streaming) {
                    this.updateStatus(alert.handle, service, false);
                }
            }
        }
        return this.postStreams({ alerts, streams }, service);
    }

    async getSmashcast() {

        let alerts = this.smashAlerts
        if (!alerts || !alerts.length) return;

        const channels = [...new Set(alerts.map(a => a.handle))];

        this.queues.smash.queue(channels)
    }

    async getMixer() {

        let alerts = this.mixerAlerts
        if (!alerts || !alerts.length) return;

        const channels = [...new Set(alerts.map(a => a.handle))];

        this.queues.mixer.queue(channels)

    }

    async handleTwitch(stream, userID, isLive) {

        console.log(userID);

        let res;

        try {
            res = await axios.get(`https://api.twitch.tv/helix/users?id=${userID}`, {
                headers: {
                    'Authorization': `Bearer ${this.twitchAccess}`
                }
            });
        } catch (e) {
            return console.log(e);
        }

        let user = res.data.data[0];

        console.log(user);

        if (!user) return;

        let streamAlert = await this.models.StreamAlert.findOne({ service: 'twitch', handle: user.login });

        if (streamAlert.streaming && isLive) return;

        if (streamAlert.streaming) {
            return this.updateStatus(user.login, 'twitch', false);
        } else if (!streamAlert.streaming && isLive) {
            this.updateStatus(user.login, 'twitch', true);
        }

        let res1;

        try {
            res1 = await axios
                .get(`https://api.twitch.tv/kraken/channels/${user.id}`, {
                    headers: {
                        'Authorization': `OAuth ${this.twitchAccess}`,
                        'Accept': 'application/vnd.twitchtv.v5+json'
                    }
                });
        } catch (e) {
            console.log(e);
        }

        let channel = res1.data;

        let res2;

        try {
            res2 = await axios
                .get(`https://api.twitch.tv/helix/games?id=${stream.game_id}`, {
                    headers: {
                        'Authorization': `Bearer ${this.twitchAccess}`
                    }
                });
        } catch (e) {
            console.log(e);
        }

        let game = res2.data.data[0];

        let streamData = {
            service: 'Twitch',
            name: user.display_name,
            title: stream.title,
            logo: user.profile_image_url,
            url: `https://www.twitch.tv/${user.login}`,
            game: game && game.name ? game.name : 'uwu',
            startedAt: stream.started_at,
            image: channel & channel.profile_banner ? channel.profile_banner : stream.thumbnail_url.replace('{width}', '300').replace('{height}', '200')
        };

        let alerts = await this.models.StreamAlert.find({ service: 'twitch', handle: user.login });

        console.log(alerts);

        for (let alert of alerts) {
            this.postStream(streamData, 'twitch', alert);
        }
    }

    async handleMixer(channels) {
        let streams = [];

        try {
            var res = await axios
                .get(`http://mixer.com/api/v1/channels?where=online.eq.1,token.in.${channels.join(';')}`);
        } catch (err) {
            this.logger.error(err);
            return;
        }

        if (!res) throw new Error('No response from beam.');

        const data = res.body;
        if (!data) return;

        streams = data.map(c => {
            const stream = {
                service: 'Beam',
                name: c.user.username.toLowerCase(),
                display_name: c.user.username,
                logo: c.thumbnail.url,
                url: `https://mixer.com/${c.user.username}`,
                views: c.viewersCurrent,
                followers: c.numFollowers,
            };
            return stream;
        });

        return this.logic(this.mixerAlerts, streams, 'mixer');
    }

    async handleSmashcast(channels) {
        let streams = [];

        try {
            this.queues.get('smash').queue({ url: `https://api.smashcast.tv/media/live/${channels.join(',')}?fast=1` })
        } catch (err) {
            this.logger.error(err);
            return;
        }

        if (!res) throw new Error('No response from smashcast.');

        const data = res.body;

        if (!data || !data.livestream) return;

        streams = data.livestream.map(c => {
            const stream = {
                service: 'Smashcast',
                name: c.media_name,
                display_name: c.media_display_name,
                logo: c.media_thumbnail,
                status: c.media_status,
                url: c.channel.channel_link,
                views: c.media_views,
                followers: c.channel.followers,
            };
            return stream;
        });

        return this.logic(this.smashAlerts, streams, 'smash');
    }
}


module.exports = new StreamService();
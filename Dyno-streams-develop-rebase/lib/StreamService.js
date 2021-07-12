const axios = require('axios');
const SnowTransfer = require('snowtranfer');
const models = require('./models');
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

        process.on('unhandledRejection', (reason, p) => {
            console.log(`Unhandled rejection at: Promise  ${p} reason:  ${reason.stack}`);
        });
    }

    async start() {


        this.client = new SnowTransfer(config.token, {
            baseHost: config.gate
        });

        this.setupAPI();

        setInterval(async () => {
            let currentTime = new Date();
            let needToReSub = await models.StreamSubscription.find({ lastSub: { $gte: currentTime - (864000 - 86400) } });

            if (needToReSub && needToReSub.length > 0) {
                for (let sub of needToReSub) {
                    await axios.post('https://api.twitch.tv/helix/webhooks/hub', {
                        callback: config.twitch.callback,
                        mode: 'subscribe',
                        topic: `https://api.twitch.tv/helix/streams?user_id=${sub.id}`,
                        lease_seconds: 864000,
                        secret: config.twitch.secret
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

        this.webhooks.on('twitch', hook => {
            this.handleTwitch(hook.data[0]);
        });
    }

    setupAPI() {
        this.app = express();

        this.app.use(bodyParser.json());

        this.webhooks = new Webhooks(this.app, models);

        this.alerts = new Alerts(this.app, models);

        this.app.post('/streams/*', (req, res, next) => {
            let token = req.get('Authorization');

            if (token !== config.apiToken) {
                return res.status(401).end();
            }

            next();
        });

        ths.app.listen(8050);

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
        let alerts = await models.StreamAlert.find({
            service: service
        }).lean().exec();
        this[`${service}Alerts`] = alerts;
    }

    updateStatus(handle, service, status) {
        models.StreamAlert.update({ service: service, handle: handle }, { $set: { streaming: status } }, { multi: true })
            .catch(err => this.logger.error(err));
    }

    async postStream(stream, service, alert, config) {
        if (!stream) return;

        let color = this.hexes[service];
        let serviceURL = this.urls[service];

        const embed = {
            description: `**[${stream.name} is now live on ${stream.service}!](${stream.url})**\n${stream.title}`,
            color: color,
            timestamp: stream.startedAt,
            footer: {
                icon_url: serviceURL,
                text: 'Stream started at'
            },
            image: {
                url: stream.image
            },
            thumbnail: {
                url: stream.logo
            },
            fields: [
                {
                    name: 'Currently Playing:',
                    value: stream.game
                }
            ],
            author: {
                name: stream.name,
                url: stream.url,
                icon_url: stream.logo
            }
        }

        this.client.webhook.executeWebhook(alert.webhook.id, alert.webhook.token, { embed });
    }

    async postStreams(data, service) {
        if (!data) return;

        const { alerts, streams } = data;
        for (let stream of streams) {
            let alerts1 = alerts.filter(a => a.handle === stream.name);
            let guildIDs = alerts1.map(a => a.guild);
            let guildConfigs = await models.Server.find({ _id: { $in: guildIDs } }, { clientID: 1, _id: 1 });
            for (const alert of alerts1) {
                let guildConfig = guildConfigs.find(g => g._id === alert.guild);
                this.postStream(stream, service, alert, guildConfig);
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

    async handleTwitch(stream) {

        let streamAlert = await models.StreamAlert.findOne({ service: 'twitch', handle: stream.name });

        if (streamAlert.streaming) {
            return this.updateStatus(stream.name, 'twitch', false);
        } else {
            this.updateStatus(stream.name, 'twitch', true);
        }

        try {
            let user = await axios.get(`https://api.twitch.tv/helix/users?id=${stream.user_id}`, {
                headers: {
                    'Client-ID': config.twitch.clientID
                }
            });
        } catch (e) {
            return console.log(e);
        }

        if (!user) return;

        try {
            let channel = await axios
                .get(`https://api.twitch.tv/kraken/channels/${user.id}`, {
                    headers: {
                        'Client-ID': config.twitch.clientID,
                        'Accept': 'application/vnd.twitchtv.v5+json'
                    }
                });
        } catch (e) {
            return console.log(e);
        }

        try {
            let game = await axios
                .get(`https://api.twitch.tv/helix/games?id=${stream.game_id}`, {
                    headers: {
                        'Client-ID': config.twitch.clientID
                    }
                });
        } catch (e) {
            return console.log(e);
        }


        user = user.data.data;
        game = game.data.data;
        channel = channel.data.data;

        let stream = {
            service: 'Twitch',
            name: user.display_name,
            title: stream.title,
            logo: user.profile_image_url,
            viewers: stream.viewer_count,
            url: `https://www.twitch.tv/${user.login}`,
            game: game.name,
            startedAt: stream.started_at,
            image: channel.profile_banner
        };

        let alerts = await models.StreamAlert.find({
            service: 'twitch',
            handle: stream.name
        });

        for (let alert of alerts) {
            let guildConfig = await models.Server.findOne({ _id: alert.guild }, { clientID: 1, _id: 1 });
            this.postStream(stream, 'twitch', alert, guildConfig);
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
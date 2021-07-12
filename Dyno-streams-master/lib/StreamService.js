const superagent = require('superagent');
const config = require('../config.json');
const Eris = require('eris');
const models = require('./models.js');
const Logger = require('./logger.js');
const logger = new Logger();


class StreamService {
    constructor() {
        this.clients = new Map();
        this.logger = logger;
    }

    async start() {
        try {
            this.globalConfig = await models.Dyno.findOne().lean().exec();
        } catch (err) {
            throw new Error(err);
        }

        try{
            this.config = require("path/to/config");
        } catch (err) {
            throw new Error(err);
        }

        try {
            for (let client of this.globalConfig.clients) {
                 let erisClient = new Eris(this.config.tokens[client.id],{restMode: true });
                 this.clients.set(client.id, erisClient);
            }
        } catch(err) {
            throw new Error(err);
        }

        setInterval(() => {
            this.poll();
        }, 1000 * 30);
    }

    async poll() {
        const twitchAlerts = await this.getAlerts('twitch');
        const smashAlerts = await this.getAlerts('smash');
        const mixAlerts = await this.getAlerts('mixer');

        this.getTwitch(twitchAlerts)
            .then(data => this.postStreams(data))
            .catch(err => logger.error(err));

        this.getSmashcast(smashAlerts)
            .then(data => this.postStreams(data))
            .catch(err => console.log(`[ERROR] ${err}`));

        this.getMixer(mixAlerts)
            .then(data => this.postStreams(data))
            .catch(err => console.log(`[ERROR] ${err}`));
    }

    getAlerts(service) {
        return models.StreamAlert.find({
            service: service
        }).lean().exec();
    }

    updateStatus(handle, service, status) {
        models.StreamAlert.update({ service: service, handle: handle }, { $set: { streaming: status } }, { multi: true })
            .then(() => this.logger.info(`Updated ${service} ${handle} ${status}`))
            .catch(err => this.logger.error(err));
    }

    async postStreams(data) {
        if (!data) return;

        const { alerts, streams } = data;

        for(let stream of streams) {
            let alerts1 = alerts.filter(a => a.handle === stream.name);
            let guildIDs = alerts1.map(a => a.guild);
            let guildConfigs = await models.Server.find({ _id: { $in: guildIDs } }, { clientID: 1, streams: 1, _id: 1 });

         for (const alert of alerts1) {
                    let guildConfig = guildConfigs.find(g => g._id === a.guildID);
                    let eris = this.clients.get(guildConfig.clientID);
                    const channel = await eris.getRESTChannel(alert.channel).catch(() => false);
                    if (!channel) continue;
                    const embed = {
                        color: 2347360,
                        author: {
                            name: stream.display_name || stream.name,
                            icon_url: stream.logo,
                        },
                        title: `${stream.display_name || stream.name} is now live on ${stream.service}`,
                        url: stream.url,
                        fields: [
                            { name: 'Viewers', value: stream.viewers.toString(), inline: true },
                            { name: 'Followers', value: stream.followers.toString(), inline: true },
                        ],
                        timestamp: new Date(),
                    };

                    if (stream.logo && stream.logo.length) {
                            embed.thumbnail = { url: stream.logo, width: 80, height: 80 };
                        }

                    if (stream.game && stream.game.length) {
                            embed.fields.push({ name: 'Game', value: stream.game, inline: false });
                        }

                    eris.createMessage(channel.id, { embed });
            }
        }
    }


    async getTwitch(alerts) {
        if (!alerts || !alerts.length) return;


        const channels = [...new Set(alerts.map(a => a.handle))];
        let streams = [];

        for (let i = 0; i < channels.length; i += 100) {
            const chunk = channels.slice(i, i + 100).join(',');

            try {
                var res = await superagent
                    .get(`https://api.twitch.tv/kraken/streams?channel=${chunk}&limit=100&stream_type=live`)
                    .set('Accept', 'application/vnd.twitchtv.v3+json')
                    .set('Client-ID', config.twitch.clientID);
            } catch (err) {
                this.logger.error(err);
                continue;
            }

            if (!res) throw new Error('No response from twitch.');

            const results = res.body;

            if (!results || !results.streams) continue;

            streams = streams.concat(results.streams.map(d => {
                const stream = {
                    service: 'twitch',
                    name: d.channel.name,
                    display_name: d.channel.display_name,
                    status: d.channel.status,
                    game: d.game,
                    logo: d.channel.logo,
                    url: d.channel.url,
                    viewers: d.viewers || 0,
                    followers: d.channel.followers || 0,
                };

                return stream;
            }));
        }

        let toDelete = [];
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
                if (alert.streaming === true) {
                    let delete1 = toDelete.find(alert);
                    if (!delete1) {
                        toDelete.push(stream.name);
                    }
                    let deleteAlerts = alerts.filter(a => a.handle === alert.handle);
                    deleteAlerts.forEach(a=> {
                        let aa = alerts.find(aaa => aaa.channel === a.channel);
                        let index = alerts.indexOf(aa);
                        alerts.splice(index);
                    });
                } else {
                    this.updateStatus(alert.handle, 'twitch', true);
                }
            } else if (alert.streaming === true) {
                this.updateStatus(alert.handle, 'twitch', false);
            }
        }

        for (item of toDelete) {
            let i = streams.find(s => s.name === item);
            let index = streams.indexOf(i);
            streams.splice(index);
        }

        return { alerts, streams };
    }

    async getSmashcast(alerts) {


        if (!alerts || !alerts.length) return;

        const channels = [...new Set(alerts.map(a => a.handle))];

        let streams = [];

        try {
            var res = await superagent
                .get(`https://api.smashcast.tv/media/live/${channels.join(',')}?fast=1&live_only=1`);
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

       let toDelete = [];
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
                if (alert.streaming === true) {
                    let delete1 = toDelete.find(alert);
                    if (!delete1) {
                        toDelete.push(stream.name);
                    }
                    let deleteAlerts = alerts.filter(a => a.handle === alert.handle);
                    deleteAlerts.forEach(a=> {
                        let aa = alerts.find(aaa => aaa.channel === a.channel);
                        let index = alerts.indexOf(aa);
                        alerts.splice(index);
                    });
                } else {
                    this.updateStatus(alert.handle, 'smash', true);
                }
            } else if (alert.streaming === true) {
                this.updateStatus(alert.handle, 'smash', false);
            }
        }

        for (item of toDelete) {
            let i = streams.find(s => s.name === item);
            let index = streams.indexOf(i);
            streams.splice(index);
        }


        return { alerts, streams };
    }

    async getMixer(alerts) {


        if (!alerts || !alerts.length) return;

        const channels = [...new Set(alerts.map(a => a.handle))];

        let streams = [];

        try {
            var res = await superagent
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

       let toDelete = [];
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
                if (alert.streaming === true) {
                    let delete1 = toDelete.find(alert);
                    if (!delete1) {
                        toDelete.push(stream.name);
                    }
                    let deleteAlerts = alerts.filter(a => a.handle === alert.handle);
                    deleteAlerts.forEach(a=> {
                        let aa = alerts.find(aaa => aaa.channel === a.channel);
                        let index = alerts.indexOf(aa);
                        alerts.splice(index);
                    });
                } else {
                    this.updateStatus(alert.handle, 'mixer', true);
                }
            } else if (alert.streaming === true) {
                this.updateStatus(alert.handle, 'mixer', false);
            }
        }

        for (item of toDelete) {
            let i = streams.find(s => s.name === item);
            let index = streams.indexOf(i);
            streams.splice(index);
        }


        return { alerts, streams };
    }
}


module.exports = new StreamService();
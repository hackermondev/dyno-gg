const superagent = require('superagent');
const logger = require('./logger');
const models = require('./models');
const utils = require('./utils');

class Controller {
    constructor(bot, models) {
        this.client = bot.client;
        this.utils = utils;
        this.models = models;
    }

    getRESTData(method, cacheLimit, ...args) {
        method = `getREST${method}`;
        // cacheLimit = cacheLimit ? cacheLimit * 1000 : config.client.cache.limit;
        // const key = args.join('');

        return new Promise((resolve) => this.client[method](...args)
            .then(data => resolve(data))
            .catch(() => resolve()));
    }

    postUpdate(guildId) {
        return new Promise((resolve) => models.Dyno.findOne().lean().exec()
            .then(doc => {
                if (!doc) return resolve();
                if (!doc.webhooks) return resolve();

                for (const webhook of doc.webhooks) {
                    superagent
                        .post(`${webhook}/guildUpdate`)
                        .send(guildId)
                        .set('Accept', 'application/json')
                        .end(err => err ? logger.error(err) : false);
                }

                return resolve();
            })
            .catch(err => {
                logger.error(err);
                return resolve();
            }));
    }
}

module.exports = Controller;

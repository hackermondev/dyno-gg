'use strict';

const moment = require('moment-timezone');
const Controller = require('../../core/Controller');
const config = require('../../core/config');
const logger = require('../../core/logger').get('ModLogs');
const db = require('../../core/models');

class ModLogs extends Controller {
	constructor(bot) {
		super(bot);

		const basePath = '/api/modules/:id/modlogs';

		return {
			get: {
				method: 'post',
				uri: basePath,
				handler: this.post.bind(this),
			},
		};
    }

	async post(bot, req, res) {
        let docs, pageCount;
		try {
            const { page, pageSize } = req.body;
            docs = await this.getLogs(req.params.id, page, pageSize);

            let guild = await config.guilds.getOrFetch(req.params.id);

            let timezone = guild.timezone ? guild.timezone : 'America/New_York';

            docs = docs.map(d => {
                d.createdAt = moment.tz(d.createdAt, timezone).format('llll');
                return d;
            });

            const count = await this.countLogs(req.params.id);
            pageCount = Math.ceil(count / pageSize);
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
		return res.send({ logs: docs || [], pageCount });
    }

	getLogs(guildId, page = 0, pageSize = 10) {
        const limit = pageSize;
        const skip = pageSize * page;
        return db.collection('modlogs')
                .find({ server: guildId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray();
    }

    countLogs(guildId) {
        return db.collection('modlogs')
                .find({ server: guildId })
                .count();
    }
}

module.exports = ModLogs;

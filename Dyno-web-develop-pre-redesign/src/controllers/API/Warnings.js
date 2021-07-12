'use strict';

const moment = require('moment-timezone');
const Controller = require('../../core/Controller');
const config = require('../../core/config');
const db = require('../../core/models');

class Warnings extends Controller {
	constructor(bot) {
		super(bot);

		const basePath = '/api/modules/:id/warnings';

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
            const userId = req.query && req.query.userId ? req.query.userId : null;
            docs = await this.getLogs(req.params.id, page, pageSize, userId);

            let guild = await config.guilds.getOrFetch(req.params.id);

            let timezone = guild.timezone ? guild.timezone : 'America/New_York';

            docs = docs.map(d => {
                d.createdAt = moment.tz(d.createdAt, timezone).format('llll');
                return d;
            });

            const count = await this.countLogs(req.params.id);
            pageCount = Math.ceil(count / pageSize);
		} catch (err) {
			return res.status(500).send('Something went wrong.');
		}
		return res.send({ logs: docs || [], pageCount });
    }

	getLogs(guildId, page = 0, pageSize = 10, userId) {
        const limit = pageSize;
        const skip = pageSize * page;

        if (userId) {
            return db.collection('warnings')
                .find({ guild: guildId, 'user.id': userId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray();
        }

        return db.collection('warnings')
                .find({ guild: guildId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray();
    }

    countLogs(guildId) {
        return db.collection('warnings')
                .find({ guild: guildId })
                .count();
    }
}

module.exports = Warnings;

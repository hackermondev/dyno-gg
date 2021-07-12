'use strict';

const moment = require('moment-timezone');
const Controller = require('../../core/Controller');
const config = require('../../core/config');
const db = require('../../core/models');

class DashboardLogs extends Controller {
	constructor(bot) {
		super(bot);

		const basePath = '/api/modules/:id/dashboardlogs';

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
			return res.status(500).send('Something went wrong.');
		}
		return res.send({ logs: docs || [], pageCount });
    }

	async getLogs(guildId, page = 0, pageSize = 10) {
        const limit = pageSize;
        const skip = pageSize * page;
        try {
            const logs = await db.collection('weblogs')
                    .find({ guild: guildId }, { projection: {
                        guild: 1,
                        userid: 1,
                        user: 1,
                        action: 1,
                        createdAt: 1,
                    } })
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .toArray();
            return logs && logs.map(l => {
                l.user = {
                    id: l.user.id,
                    username: l.user.username,
                    discriminator: l.user.discriminator,
                };
                return l;
            });
        } catch (err) {
            return Promise.reject(err);
        }
    }

    countLogs(guildId) {
        return db.collection('weblogs')
                .find({ guild: guildId })
                .count();
    }
}

module.exports = DashboardLogs;

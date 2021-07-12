const axios = require('axios');
const Controller = require('../../core/Controller');
const config = require('../../core/config');
const { models } = require('../../core/models');
const logger = require('../../core/logger').get('GuildAPI');

class Guild extends Controller {
	constructor(bot) {
		super(bot);
		return {
			beforeGuild: {
				method: 'use',
				uri: [
					'/api/guild/:id/*',
					'/api/userGuilds/:id/*',
				],
				handler: this.beforeGuild.bind(this),
			},
			debug: {
				method: 'post',
				uri: '/api/guild/:id/debug',
				handler: this.debug.bind(this),
			},
			getGuild: {
				method: 'post',
				uri: '/api/guild/:id',
				handler: this.guild.bind(this),
			},
			getUserGuilds: {
				method: 'post',
				uri: '/api/userGuilds/:id',
				handler: this.user.bind(this),
			}
		};
	}

	async beforeGuild(bot, req, res, next) {
		if (!req.headers.authorization || req.headers.authorization !== config.global.apiToken) {
			return res.status(403).send({ error: 'Forbidden' });
		}

		return next();
	}

	async guild(bot, req, res) {
		// if (!req.headers.authorization || req.headers.authorization !== config.global.apiToken) {
		// 	return res.status(403).send({ error: 'Forbidden' });
		// }

		const shardCount = config.global.shardCount;
		const premiumShardCount = config.global.premiumShardCount;

		const shard = ~~((req.params.id / 4194304) % shardCount);
		const premiumShard = ~~((req.params.id / 4194304) % premiumShardCount);

		try {
			const guild = await models.Server.findOne({ _id: req.params.id }).lean();
			const [owner, premiumUser, response] = await Promise.all([
				this.client.getRESTUser(guild.ownerID).catch(() => null),
				this.client.getRESTUser(guild.premiumUserId).catch(() => null),
				axios.get('http://localhost:8280/api/status?shard_status=1'),
			]);

			const env = guild.isPremium && guild.premiumInstalled ? 'premium' : 'prod';
			const servers = response && response.data && response.data[env] && response.data[env].statuses;

			const server = servers.find(s => s.result && s.result.shards.includes(env === 'premium' ? premiumShard : shard));
			/*const serverName = Object.keys(servers).find(serverName => {
				return servers[serverName].find(s => s.result && s.result.shards.includes(shard));
			});*/

			if (!server) {
				return res.status(500).send('Unable to find shard');
			}

//			const server = servers[serverName].find(s => s.result && s.result.shards.includes(shard));
			const cluster = server.id;

			const payload = {
				env,
				...guild,
				owner,
				premiumUser,
				serverName: server.result.server,
				server,
				shard: env === 'premium' ? premiumShard : shard,
				cluster,
			};

			return res.send(payload);
		} catch (err) {
			logger.error(err);
			return res.status(500).send(err);
		}
	}

	async debug(bot, req, res) {
		try {
			await models.Server.updateOne({ _id: req.params.id }, { $set: { debugEnabled: req.body.debug || false } });
			return res.send('OK');
		} catch (err) {
			return res.status(500).send(err);
		}
	}

	async user(bot, req, res) {
		try {
			let guilds = await models.Server
				.find({ $or: [{ ownerID: req.params.id }, { premiumUserId: req.params.id }] })
				.sort({ memberCount: -1 })
				.lean()
				.exec();

			if (!req.query.deleted) {
				guilds = guilds.filter(g => !g.deleted);
			}

			return res.send(guilds);
		} catch (err) {
			logger.error(err);
			return res.status(500).send(err);
		}
	}
}

module.exports = Guild;

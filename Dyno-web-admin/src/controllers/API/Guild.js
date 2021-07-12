const axios = require('axios');
const Controller = require('../../core/Controller');
const config = require('../../core/config');
const { models } = require('../../core/models');

class Guild extends Controller {
	constructor(bot) {
		super(bot);
		return {
			getGuild: {
				method: 'post',
				uri: '/api/guild/:id',
				handler: this.guild.bind(this),
			},
		};
	}

	async guild(bot, req, res) {
		if (!req.headers.authorization || req.headers.authorization !== config.global.apiToken) {
			return res.status(403).send({ error: 'Forbidden' });
		}

		const shardCount = config.global.shardCount;
		const shard = ~~((req.params.id / 4194304) % shardCount);

		try {
			const guild = await models.Server.findOne({ _id: req.params.id }).lean();
			const [owner, premiumUser, response] = await Promise.all([
				this.client.getRESTUser(guild.ownerID).catch(() => null),
				this.client.getRESTUser(guild.premiumUserId).catch(() => null),
				axios.get('http://localhost:8280/api/status'),
			]);
			const servers = response && response.data;

			const serverName = Object.keys(servers).find(serverName => {
				return servers[serverName].find(s => s.result && s.result.shards.includes(shard));
			});

			if (!serverName) {
				return this.error(`Unable to find shard.`);
			}

			const server = servers[serverName].find(s => s.result && s.result.shards.includes(shard));
			const cluster = server.id;

			const payload = {
				...guild,
				owner,
				premiumUser,
				serverName,
				server,
				cluster,
			};

			return res.send(payload);
		} catch (err) {
			return res.status(500).send(err);
		}
	}
}

module.exports = Guild;

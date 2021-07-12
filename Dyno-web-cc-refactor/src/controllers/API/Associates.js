'use strict';

const superagent = require('superagent');
const Controller = require('../../core/Controller');
const { models } = require('../../core/models');
const logger = require('../../core/logger').get('Associates');

class Associates extends Controller {
	constructor(bot) {
		super(bot);

		const basePath = '/api/server/:id/associates';

		return {
			get: {
				method: 'get',
				uri: basePath,
				handler: this.get.bind(this),
			},
			create: {
				method: 'post',
				upload: true,
				uri: `${basePath}/create`,
				handler: this.create.bind(this),
			},
			update: {
				method: 'post',
				upload: true,
				uri: `${basePath}/update`,
				handler: this.update.bind(this),
			},
			delete: {
				method: 'post',
				uri: `${basePath}/delete`,
				handler: this.delete.bind(this),
			},
		};
	}

	async getConfig() {
		try {
			const doc = await models.Dyno.findOne().lean().exec();
			return doc;
		} catch (err) {
			throw err;
		}
	}

	async updateConfig(associates) {
		try {
			await models.Dyno.update({}, { $set: { associates } });
		} catch (err) {
			logger.error(err);
			throw err;
		}
	}

	async resolveInvite(invite) {
		const match = invite.match(/https:\/\/(?:discord.gg|discordapp.com\/api\/invite)\/([\w\d]+)/);
		let code;

		if (match && match.length > 1) {
			code = match[1];
		}

		if (!code) {
			return Promise.reject('Unable to resolve invite code.');
		}

		try {
			const response = await superagent.get(`https://discordapp.com/api/invite/${code}?with_counts=true`);
			if (response && response.body) {
				return response.body;
			}
			return Promise.reject(`Invite not found.`);
		} catch (err) {
			return Promise.reject('Invalid invite.');
		}
	}

	async get(bot, req, res) {
		try {
			var doc = await this.getConfig();
		} catch (err) {
			return res.status(500).send('Something went wrong.');
		}
		return res.send({ associates: doc.associates || [] });
	}

	create(bot, upload, req, res) {
		req.uploadDir = 'associates';
		upload.single('banner')(req, res, async (err) => {
			if (err) {
				logger.error(err);
				return res.status(500).send('Something went wrong.');
			}

			const data = Object.assign({}, req.body, { banner: `https://cdn.dyno.gg/${req.file.key}` });

			try {
				var globalConfig = await this.getConfig();
			} catch (err) {
				return res.status(500).send('Something went wrong.');
			}

			globalConfig.associates = globalConfig.associates || [];

			const test = globalConfig.associates.find(a => a.name === data.name);
			if (test) {
				return res.status(400).send(`The associate ${data.name} already exists.`);
			}

			try {
				const inviteLink = data.links.find(l => l.name === 'Server Invite');
				const inviteData = await this.resolveInvite(inviteLink.value);
				if (!inviteData) {
					return res.status(500).send(`Unable to resolve invite ${inviteLink.value}`);
				}
				data.id = inviteData.guild.id;
			} catch (err) {
				return res.status(500).send(err);
			}

			if (!data.sponsor) {
				try {
					await models.Server.update({ _id: data.id }, { $set: { isPartner: true } });
				} catch (err) {
					return res.status(500).send('Unable to update guild config.');
				}
			}

			globalConfig.associates.push(data);

			try {
				await this.updateConfig(globalConfig.associates);
			} catch (err) {
				return res.status(500).send('Something went wrong.');
			}

			return res.send(data);
		});
	}

	async update(bot, upload, req, res) {
		req.uploadDir = 'associates';
		upload.single('banner')(req, res, async (err) => {
			if (err) {
				logger.error(err);
				return res.status(500).send('Something went wrong.');
			}

			try {
				var globalConfig = await this.getConfig();
			} catch (err) {
				return res.status(500).send('Something went wrong.');
			}

			globalConfig.associates = globalConfig.associates || [];

			const index = globalConfig.associates.findIndex(a => a.name === req.body.name);
			if (index === -1) {
				return res.status(400).send(`The associate ${req.body.name} doesn't exist.`);
			}

			let data;

			const associate = globalConfig.associates[index];

			if (req.file) {
				data = Object.assign({}, req.body, { banner: `https://cdn.dyno.gg/${req.file.key}` });
			} else {
				data = Object.assign({}, req.body, { banner: associate.banner });
			}

			try {
				const inviteLink = data.links.find(l => l.name === 'Server Invite');
				const inviteData = await this.resolveInvite(inviteLink.value);
				if (!inviteData) {
					return res.status(500).send(`Unable to resolve invite ${inviteLink.value}`);
				}
				data.id = inviteData.guild.id;
			} catch (err) {
				return res.status(500).send(err);
			}

			if (!data.sponsor) {
				try {
					await models.Server.update({ _id: data.id }, { $set: { isPartner: true } });
				} catch (err) {
					return res.status(500).send('Unable to update guild config.');
				}
			}

			globalConfig.associates[index] = data;

			try {
				await this.updateConfig(globalConfig.associates);
			} catch (err) {
				return res.status(500).send('Something went wrong.');
			}

			return res.send(data);
		});
	}

	async delete(bot, req, res) {
		try {
			var globalConfig = await this.getConfig();
		} catch (err) {
			return res.status(500).send('Something went wrong.');
		}

		globalConfig.associates = globalConfig.associates || [];

		const data = req.body.associate;

		const index = globalConfig.associates.findIndex(a => a && a.name === data.name);
		if (index === -1) {
			return res.status(400).send(`The associate ${data.name} doesn't exist.`);
		}

		globalConfig.associates.splice(index, 1);

		try {
			await this.updateConfig(globalConfig.associates);
		} catch (err) {
			return res.status(500).send('Something went wrong.');
		}

		return res.send('OK');
	}
}

module.exports = Associates;

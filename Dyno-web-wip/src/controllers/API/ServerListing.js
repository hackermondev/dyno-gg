'use strict';

const superagent = require('superagent');
const Controller = require('../../core/Controller');
const db = require('../../core/models');
const minio = require('../../core/minio');
const sharp = require('sharp');
// const logger = require('../../core/logger');

class ServerListing extends Controller {
	constructor(bot) {
		super(bot);

		const basePath = '/api/server/:id/serverlisting';
		if (!process.env.ENABLE_SERVER_LISTING) {
			return {};
		}

		return {
			get: {
				method: 'get',
				uri: basePath,
				handler: this.get.bind(this),
			},
			update: {
				method: 'post',
				memoryUpload: true,
				uri: `${basePath}/update`,
				handler: this.update.bind(this),
			},
		};
	}

	async resolveInvite(invite) {
		const match = invite.match(/https:\/\/(?:discord.gg|discordapp.com\/api\/invite|discordapp.com\/invite)\/([\w\d]+)/);
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
			const id = req.params.id;

			if (!id) {
				res.status(500).send('No id specified');
				return;
			}

			if (!id.match(/^([0-9]+)$/)) {
				res.status(500).send('Invalid id');
				return;
			}

			const coll = db.collection('serverlist_store');

			let server = await coll.findOne({ id });

			if (!server) {
				const serverColl = db.collection('servers');
				const guildConfig = await serverColl.findOne({ _id: id });
				server = {
					id,
					icon: guildConfig.iconURL,
					name: guildConfig.name,
					listed: false,
					borderColor: '#202020',
					description: 'A very interesting server',
				};
			}

			const categoriesColl = db.collection('serverlist_categories');
			let categories = await categoriesColl.find({ disabled: false }, { _id: 0, name: 1 }).toArray();
			categories = categories.map((v) => v.name);

			res.send({ server, categories });
		} catch (err) {
			res.status(500).send(err.message);
		}
	}

	async processAndUploadImage(fileKey, bucket, buffer, vertical) {
		const width = vertical ? 242 : 238;
		const height = vertical ? 416 : 271;
		buffer = await sharp(buffer)
				.resize(width, height)
				.blur()
				.png({
					progressive: true,
					compressionLevel: 9,
				})
				.toBuffer();

		return new Promise((resolve, reject) => {
			minio.putObject(bucket, fileKey, buffer, buffer.size, (err, etag) => {
				if (err) reject(err);
				resolve(etag);
			});
		});
	}

	async update(bot, upload, req, res) {
		req.uploadDir = `serverlisting/${req.params.id}`;
		upload.fields([{ name: 'backgroundImageVerticalFile' }, { name: 'backgroundImageFile' }])(req, res, async (err) => {
			if (err) {
				res.status(500).send(err.message);
				return;
			}

			try {
				let {
					inviteUrl,
					borderColor,
					description,
					listed,
					tags,
					categories,
				} = req.body;

				tags = JSON.parse(tags);
				categories = JSON.parse(categories);

				let {
					backgroundImageFile,
					backgroundImageVerticalFile,
				} = req.files;

				let icon;
				const id = req.params.id;

				listed = (listed === 'true');

				if (!inviteUrl && listed) {
					res.status(500).send('Invalid invite');
					return;
				}

				if (inviteUrl) {
					try {
						const inviteInfo = await this.resolveInvite(inviteUrl);

						if (!inviteInfo && listed) {
							res.status(500).send('Invalid invite');
							return;
						}

						if (inviteInfo && inviteInfo.guild.id !== id) {
							res.status(500).send('Invalid invite');
							return;
						}

						if (inviteInfo && !inviteInfo.guild.icon && listed) {
							res.status(500).send('Please add a guild icon to get listed');
							return;
						}

						if (inviteInfo && inviteInfo.guild.icon) {
							icon = `https://cdn.discordapp.com/icons/${id}/${inviteInfo.guild.icon}.png?size=64`;
						}
					} catch (err) {
						res.status(500).send(err);
						return;
					}
				}

				if (borderColor) {
					if (!/(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(borderColor)) {
						res.status(500).send('Invalid border color');
						return;
					}
				}

				if (description) {
					if (description.length > 200) {
						res.status(500).send('Description too long');
						return;
					}
				} else {
					res.status(500).send('Please provide a description');
				}

				if (tags) {
					if (!Array.isArray(tags)) {
						res.status(500).send('Invalid tags');
						return;
					}

					if (tags.some((i) => typeof i !== 'string')) {
						res.status(500).send('Invalid tags');
						return;
					}
				}

				const categoriesColl = db.collection('serverlist_categories');
				let categoriesList = await categoriesColl.find({ disabled: false }, { _id: 0, name: 1 }).toArray();
				categoriesList = categoriesList.map((v) => v.name);

				if (categories) {
					if (!Array.isArray(categories)) {
						res.status(500).send('Invalid categories');
						return;
					}

					if (categories.some((i) => typeof i !== 'string')) {
						res.status(500).send('Invalid categories');
						return;
					}

					if (categories.some((i) => !categoriesList.includes(i))) {
						res.status(500).send('Invalid categories');
						return;
					}
				}

				const minioBucket = 'server-listing';
				if (backgroundImageFile && backgroundImageFile.length > 0) {
					backgroundImageFile = backgroundImageFile[0];
					const fileKey = `${id}/regular/bg.png`;

					await this.processAndUploadImage(fileKey, minioBucket, backgroundImageFile.buffer, false);
					backgroundImageFile.key = fileKey;
				}

				if (backgroundImageVerticalFile && backgroundImageVerticalFile.length > 0) {
					backgroundImageVerticalFile = backgroundImageVerticalFile[0];
					const fileKey = `${id}/vertical/bg.png`;

					await this.processAndUploadImage(fileKey, minioBucket, backgroundImageVerticalFile.buffer, true);
					backgroundImageVerticalFile.key = fileKey;
				}

				// Timestamp used for cache bursting
				const timestamp = (new Date()).getTime();
				const backgroundImage = backgroundImageFile && `https://s.dyno.gg/${minioBucket}/${backgroundImageFile.key}?cb=${timestamp}`;
				const backgroundImageVertical = backgroundImageVerticalFile && `https://s.dyno.gg/${minioBucket}/${backgroundImageVerticalFile.key}?cb=${timestamp}`;

				const coll = db.collection('serverlist_store');

				let server = await coll.findOne({ id });

				if (!server) {
					const serverColl = db.collection('servers');
					const guildConfig = await serverColl.findOne({ _id: id });
					server = {
						id,
						icon: guildConfig.iconURL,
						name: guildConfig.name,
						borderColor,
						description,
						listed,
						backgroundImage,
						backgroundImageVertical,
						categories,
						tags,
					};

					await coll.insert(server);
				} else {
					let setData = {};
					setData.borderColor = borderColor || '#202020';
					setData.description = description;
					setData.listed = listed || false;
					setData.inviteUrl = inviteUrl;
					setData.tags = tags || undefined;
					setData.categories = categories || undefined;

					if (backgroundImage) {
						setData.backgroundImage = backgroundImage || undefined;
					}
					if (backgroundImageVertical) {
						setData.backgroundImageVertical = backgroundImageVertical || undefined;
					}

					if (icon) {
						setData.icon = icon;
					}

					await coll.updateOne({ id }, { $set: setData });
				}
				res.status(200).end();
			} catch (err) {
				res.status(500).send(err.message);
			}
		});
	}
}

module.exports = ServerListing;

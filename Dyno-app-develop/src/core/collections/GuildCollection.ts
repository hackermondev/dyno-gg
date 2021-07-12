import {Collection, Module} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as each from 'async-each';
import * as superagent from 'superagent';
import {default as models} from '../../core/models';
import {logger} from '../logger';

/**
 * @class GuildCollection
 * @extends Collection
 */
export default class GuildCollection extends Collection {
	public dyno: Dyno;
	private _client: eris.Client;
	private _config: DynoConfig;
	private _activeThreshold: number = 3600 * 1000;
	private _registering: Set<string>;

	/**
	 * A collection of guild configurations
	 * @param {Object} config The Dyno configuration object
	 * @param {Dyno} dyno The Dyno instance
	 */
	constructor(config: DynoConfig, dyno: Dyno) {
		super();

		dyno.dispatcher.registerListener('guildCreate', this.guildCreated.bind(this));
		dyno.dispatcher.registerListener('guildDelete', this.guildDeleted.bind(this));

		dyno.ipc.on('guildUpdate', this.guildUpdate.bind(this));

		setInterval(this.uncacheData.bind(this), 150000);
	}

	get globalConfig() {
		return this.dyno.globalConfig;
	}

	/**
	 * Uncache guild configs
	 */
	public uncacheData() {
		each([...this.values()], (guild: GuildConfig) => {
			if ((Date.now() - guild.cachedAt) > 900) {
				this.delete(guild._id);
			}
		});
	}

	/**
	 * Get or fetch a guild, no async/await for performance reasons
	 */
	public getOrFetch(id: string) {
		const _doc = this.get(id);
		if (_doc) {
			_doc.cachedAt = Date.now();
			return Promise.resolve(_doc);
		}

		return this.fetch(id).then((doc: any) => {
			if (!doc) {
				return this.registerGuild(this._client.guilds.get(id));
			}

			doc.cachedAt = Date.now();
			this.set(doc._id, doc);

			return doc;
		});
	}

	/**
	 * Fetch a guild from the database
	 * @param {String} id Guild ID
	 * @returns {Promise}
	 */
	public fetch(id: string) {
		const updateKeys = ['name', 'region', 'iconURL', 'ownerID', 'memberCount'];
		return new Promise((resolve: any, reject: any) => {
			models.Server.findAndPopulate(id)
				.then((doc: GuildConfig) => {
					if (!doc) {
						return resolve();
					}

					doc = doc.toObject();
					let update = null;

					if (doc.deleted === true && this._client.guilds.has(id)) {
						update = {};
						doc.deleted = false;
						update.deleted = false;
					}

					if (this._client.guilds.has(id)) {
						const guild = this._client.guilds.get(id);
						for (const key of updateKeys) {
							if (guild[key] && doc[key] !== guild[key]) {
								update = update || {};
								update[key] = guild[key];
								doc[key] = guild[key];
							}
						}

						if (!doc.clientID || doc.clientID !== this._config.client.id) {
							if ((this._config.isPremium && doc.isPremium) || (!this._config.isPremium && !doc.isPremium)) {
								update = update || {};
								update.clientID = this._config.client.id;
							}
						}

						if (!doc.lastActive || (Date.now() - doc.lastActive) > this._activeThreshold) {
							update = update || {};
							update.lastActive = Date.now();
						}

						if (update) {
							models.Server.update({ _id: id }, { $set: update }).catch((err: string) => logger.error(err));
						}
					}

					this.set(doc._id, doc);
					return resolve(doc);
				})
				.catch(reject);
		});
	}

	/**
	 * Fired when a web update is received
	 */
	public guildUpdate(id: string) {
		const guild = this._client.guilds.get(id);
		if (!guild) { return; }

		logger.debug(`Web update for guild: ${id}`);

		this.fetch(id).catch((err: string) => logger.error(err));
	}

	/**
	 * Wrapper to update guild config
	 */
	public update(id: string, update: any, ...args: any[]) {
		return models.Server.update({ _id: id }, update, ...args)
			.then(() => this.postUpdate(id));
	}

	/**
	 * Post update to shard managers
	 */
	public postUpdate(guildId: string) {
		if (!this.globalConfig || !this.globalConfig.webhooks) {
			return Promise.resolve();
		}

		return new Promise((resolve: any) => {
			const promises = [];
			each(this.globalConfig.webhooks, (webhook: any, next: Function) => {
				promises.push(superagent
					.post(`${webhook}/guildUpdate`)
					.send(guildId)
					.set('Accept', 'application/json'));
				return next();
			}, () => {
				Promise.all(promises).then(resolve);
			});
		});
	}

	// getGlobal() {
	// 	if (this._globalConfig) return Promise.resolve(this._globalConfig);
	// 	return Dyno.findOne().lean().exec();
	// }

	/**
	 * Guild created event listener
	 */
	public async guildCreated({ guild }: GuildEvent) {
		// if (this._config.handleRegion && !utils.regionEnabled(guild, this._config) && guild.id !== this._config.dynoGuild) {
		// 	return this._client.uncacheGuild(guild.id);
		// }

		logger.info(`Connected to server: ${guild.id} with ${guild.channels.size} channels and ${guild.members.size} members | ${guild.name}`);

		let doc;
		try {
			doc = await models.Server.findOne({ _id: guild.id }).exec();
			if (!doc) {
				return this.registerGuild(guild, true);
			}

			await this.update(guild.id, { deleted: false }, { multi: true });
			this.set(doc._id, doc);
		} catch (err) {
			return logger.error(err);
		}

		if (this._config.isPremium && !doc.premiumInstalled) {
			doc.premiumInstalled = true;
			this.set(doc._id, doc);
			this.update(doc._id, { $set: { premiumInstalled: true } }).catch((err: string) => logger.error(err));
		}

		return false;
	}

	/**
	 * Guild deleted event listener
	 * @param  {Guild} guild Guild object
	 */
	public async guildDeleted({ guild }: GuildEvent) {
		if (guild.unavailable) { return; }

		if (this._config.isPremium) {
			const guildConfig = await this.getOrFetch(guild.id);
			if (!guildConfig || !guildConfig.isPremium) {
				return;
			}
			if (guildConfig.isPremium && guildConfig.premiumInstalled) {
				return this.update(guild.id, { $set: { premiumInstalled: false } }).catch(() => false);
			}

			return;
		}

		this.update(guild.id, { deleted: true, deletedAt: new Date() })
			.catch((err: string) => logger.error(err));
	}

	/**
	 * Register server in the database
	 */
	public registerGuild(guild: eris.Guild, newGuild?: boolean) {
		if (!guild || !guild.id) { return; }
		if (this._registering.has(guild.id)) { return; }

		this._registering.add(guild.id);

		const doc: GuildConfig = {
			_id: guild.id,
			clientID: this._config.clientID,
			name: guild.name,
			iconURL: guild.iconURL,
			ownerID: guild.ownerID,
			memberCount: guild.memberCount,
			region: guild.region || null,
			modules: {},
			commands: {},
			lastActive: Date.now(),
			deleted: false,
		};

		logger.info(`Registering guild: ${guild.id} ${guild.name}`);

		if (newGuild && !this._config.isPremium) {
			this.dmOwner(guild);
		}

		return new Promise((resolve: any, reject: any) => {
			// add modules
			for (const mod of this.dyno.modules.values()) {
				// ignore core modules or modules that shouldn't be listed
				if (mod.core && (mod.hasOwnProperty('list') && mod.list === false)) {
					continue;
				}
				doc.modules[mod.module] = mod.enabled;
			}

			for (const cmd of this.dyno.commands.values()) {
				if (cmd.permissions === 'admin') {
					continue;
				}

				// ignore commands that belong to a module
				if (this.dyno.modules.find((o: Module) => o.module === cmd.group) && doc.modules[cmd.group] === false) {
					doc.commands[cmd.name] = false;
					continue;
				}
				doc.commands[cmd.name] = (cmd.enabled || !cmd.disabled);
			}

			this.update(doc._id, doc, { upsert: true })
				.then(() => {
					doc.cachedAt = Date.now();

					this.set(guild.id, doc);
					return resolve(doc);
				})
				.catch((err: string) => {
					logger.error(err);
					return reject(err);
				})
				.then(() => this._registering.delete(guild.id));
		});
	}

	/**
	 * Attempt to send a DM to guild owner
	 */
	private async sendDM(guild: eris.Guild, content: string) {
		try {
			const channel = await this._client.getDMChannel(guild.ownerID);
			if (!channel) {
				return Promise.reject('Channel is undefined or null.');
			}

			this.dyno.utils.sendMessage(channel, content).catch(() => false);
		} catch (err) {
			logger.error(err);
			return Promise.reject(err);
		}
	}

	/**
	 * DM Guild owner
	 */
	private dmOwner(guild: eris.Guild) {
		if (this._config.test || this._config.beta) {
			return;
		}

		if (this._config.handleRegion && !this.dyno.utils.regionEnabled(guild, this._config)) {
			return;
		}

		const msgArray = [];

		msgArray.push(`Thanks for adding me to your server. Just a few things to note.`);
		msgArray.push('**1.** The default prefix is **`?`**.');
		msgArray.push('**2.** Setup the bot at **https://www.dynobot.net**');
		msgArray.push('**3.** Commands do not work in DM.');
		msgArray.push(`**4.** Join the Dyno discord server for questions, suggestions, or updates. **https://www.dynobot.net/discord**`);

		const content = msgArray.join('\n');

		this.sendDM(guild, content)
			.then(() => logger.debug('Successful DM to owner'))
			.catch(() => {
				if (guild.memberCount > 70) {
					return;
				}
				this.dyno.utils.sendMessage(guild.defaultChannel, msgArray.join('\n'));
			});
	}
}

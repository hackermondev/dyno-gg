import {Module} from '@dyno.gg/dyno-core';
import * as each from 'async-each';
import * as moment from 'moment';
import { Autorole, AutoroleSetting } from '../types/autoroles';
import * as commands from './commands';
import Ranks from './Ranks';

/**
 * Autoroles Module
 * @class Autoroles
 * @extends Module
 */
export default class Autoroles extends Module {
	public module     : string   = 'Autoroles';
	public description: string   = 'Enables auto roles on join, timed auto roles, and joinable ranks.';
	public list       : boolean  = true;
	public enabled    : boolean  = true;
	public hasPartial : boolean  = true;
	public permissions: string[] = ['manageRoles'];
	public commands   : {}       = commands;
	private ranks     : Ranks;
	private autoroles : Map<string, Autorole>;
	private _scheduleInterval: NodeJS.Timer;

	public get settings() {
		return {
			roleOnJoin: { type: this.db.Schema.Types.Mixed, default: false },
			ranks: { type: Array, default: [] },
			disableMulti: { type: Boolean },
			joinWait: { type: this.db.Schema.Types.Mixed, default: false },
			autoroles: { type: Array, default: [] },
		};
	}

	public async start(): Promise<void> {
		this.ranks = new Ranks(this.dyno, this);
		this.autoroles = new Map();

		await this.loadAutoroles().catch((err: Error) => this.logger.error(err));

		// this.schedule('*/1 * * * *', this.applyRoles.bind(this));
		this._scheduleInterval = setInterval(this.applyRoles.bind(this), 61000);
	}

	public unload() {
		clearInterval(this._scheduleInterval);
	}

	public diagnose({ guild, guildConfig, diagnosis }: any): object {
		if (!guildConfig.autoroles) {
			return diagnosis;
		}

		if (guildConfig.autoroles.roleOnJoin) {
			const role = guild.roles.get(guildConfig.autoroles.roleOnJoin);
			if (!role) {
				return diagnosis;
			}

			if (!this.hasRoleHierarchy(guild, role)) {
				diagnosis.issues.push(`The Dyno role isn't high enough to assign the ${role.name} role.`);
			}
		}

		if (guildConfig.autoroles.ranks && guildConfig.autoroles.ranks.length) {
			for (const rank of guildConfig.autoroles.ranks) {
				const role = guild.roles.get(rank.id);
				if (!role) {
					const ranks = new Ranks(this.dyno, this);
					ranks.deleteRank(guild, rank.name).catch(() => false);
					diagnosis.issues.push(`The ${rank.name} role has been deleted, I deleted the rank.`);
				}
				if (!this.hasRoleHierarchy(guild, role)) {
					diagnosis.issues.push(`The Dyno role isn't high enough to assign the ${rank.name} rank.`);
				}
			}
		}

		return diagnosis;
	}

	/**
	 * Handle new guild members
	 * @param {Guild} guild Guild object
	 * @param {Member} member Guild member object
	 */
	public guildMemberAdd({ guild, member, guildConfig }: any): void {
		// ignore bots
		if (!guildConfig || member.bot) {
			return;
		}
		if (!this.isEnabled(guild, this.module, guildConfig)) {
			return;
		}
		if (!guildConfig.autoroles || (!guildConfig.autoroles.roleOnJoin && !guildConfig.autoroles.autoroles.length)) {
			return;
		}

		const roleConfig = guildConfig.autoroles || {};

		if (roleConfig.roleOnJoin && roleConfig.roleOnJoin !== 'Select Role') {
			roleConfig.autoroles = roleConfig.autoroles || [];
			if (!roleConfig.autoroles.find((r: AutoroleSetting) => r.role === roleConfig.roleOnJoin && r.type === 'add')) {
				const autorole: AutoroleSetting = {
					role: roleConfig.roleOnJoin,
					type: 'add',
					wait: 0,
				};

				if (roleConfig.joinWait != undefined) {
					autorole.wait = roleConfig.joinWait;
				}
				roleConfig.autoroles.push(autorole);
			}
		}

		if (roleConfig.autoroles.length > 0) {
			if (!this.hasPermissions(guild, 'manageRoles')) {
				return this.statsd.increment(`autoroles.add.error`);
			}

			each(roleConfig.autoroles, (autorole: AutoroleSetting) => {
				const role = guild.roles.get(autorole.role);
				if (!role || !this.hasRoleHierarchy(guild, role)) {
					return this.statsd.increment(`autoroles.add.error`);
				}

				if (autorole.wait && !isNaN(autorole.wait) && autorole.wait > 0) {
					return this.createAutorole({
						guild: guild.id,
						user: member.id,
						role: autorole.role,
						type: autorole.type,
						duration: autorole.wait,
						createdAt: Date.now(),
					});
				}

				// If the user has an 'add' and a 'remove' autorole with the same role and no delay, we ignore it
				if (autorole.type === 'add' &&
					!roleConfig.autoroles.find((a: AutoroleSetting) => !a.wait && a.type === 'remove' && a.role === autorole.role)) {
						this.client.addGuildMemberRole(guild.id, member.id, autorole.role, `Dyno Autorole`)
							.then(() => this.statsd.increment(`autoroles.add.success`))
							.catch(() => this.statsd.increment(`autoroles.add.error`));
				}
			});
		}
	}

	public guildMemberRemove({ guild, member, guildConfig }: any): void {
		// ignore bots
		if (member.bot) {
			return;
		}
		if (!guildConfig || !guildConfig.autoroles || !guildConfig.autoroles.joinWait) {
			return;
		}

		for(const key of this.autoroles.keys()) {
			if (key.startsWith(`${guild.id}${member.id}`)) {
				this.deleteAutorole(this.autoroles.get(key));
			}
		}
	}

	/**
	 * Apply timed roles to members
	 */
	private async applyRoles(): Promise<void> {
		if (!this.dyno.isReady) {
			return;
		}
		if (!this.autoroles || this.autoroles.size === 0) {
			return;
		}

		await new Promise((res: any) => setTimeout(res, 10000));

		this.utils.asyncForEach([...this.autoroles.values()], async (data: Autorole) => {
			const guild = this.client.guilds.get(data.guild);

			const duration = moment().diff(moment(data.createdAt), 'minutes');
			if (!guild || duration < data.duration) {
				return;
			}

			const member = guild.members.get(data.user);
			if (!member) {
				return this.deleteAutorole(data);
			}

			if (!await this.isEnabled(guild, this)) {
				return;
			}

			if (data.type === 'add' && member.roles.includes(data.role)) {
				return this.deleteAutorole(data);
			}

			if (data.type === 'remove' && !member.roles.includes(data.role)) {
				return this.deleteAutorole(data);
			}

			let missingRoles = false;
			if (!this.hasPermissions(guild, 'manageRoles')) {
				missingRoles = true;
			}

			const role = guild.roles.get(data.role);
			if (!role || !this.hasRoleHierarchy(guild, role)) {
				this.statsd.increment(`autoroles.add.error`);
				return this.deleteAutorole(data);
			}

			if (data.type === 'add') {
				this.client.addGuildMemberRole(guild.id, member.id, data.role, `Dyno Autorole`)
					.then(() => {
						this.statsd.increment(`autoroles.add.success`);
						return this.deleteAutorole(data);
					})
					.catch(() => {
						this.statsd.increment(`autoroles.add.error`);
						if (missingRoles) {
							return this.deleteAutorole(data);
						}
					});
			} else if (data.type === 'remove') {
				this.client.removeGuildMemberRole(guild.id, member.id, data.role, `Dyno Autorole`)
					.then(() => {
						this.statsd.increment(`autoroles.add.success`);
						return this.deleteAutorole(data);
					})
					.catch(() => {
						this.statsd.increment(`autoroles.add.error`);
						if (missingRoles) {
							return this.deleteAutorole(data);
						}
					});
			}
		});
	}

	/**
	 * Load autoroles from the database
	 * @returns {Promise}
	 */
	private async loadAutoroles(): Promise<void> {
		let docs : Autorole[];
		try {
			docs = await this.models.Autorole.find().lean().exec();
		} catch (err) {
			this.logger.error(err, { type: 'autoroles.loadAutoroles.find' });
		}

		const firstShard = this.dyno.clientOptions.firstShardId || this.dyno.clientOptions.shardId || 0;
		const lastShard = this.dyno.clientOptions.lastShardId || this.dyno.clientOptions.shardId || 0;
		const shardIds = [...Array(1 + lastShard - firstShard).keys()].map(v => firstShard + v);

		for (const doc of docs) {
			const shardId =  ~~((<any>doc.guild / 4194304) % (this.dyno.clientOptions.shardCount || 864));
			if (!shardIds.includes(shardId)) {
				continue;
			}

			this.autoroles.set(`${doc.guild}${doc.user}${doc.role}${doc.duration}${doc.type}`, doc);
		}

		return Promise.resolve();
	}

	/**
	 * Create member autorole
	 * @param {Object} data Autorole data
	 */
	private createAutorole(data: Autorole): void {
		const doc = new this.models.Autorole(data);
		doc.save();

		this.autoroles.set(`${data.guild}${data.user}${data.role}${data.duration}${data.type}`, data);
	}

	/**
	 * Delete member autorole
	 * @param {Object} data Autorole data
	 */
	private async deleteAutorole(data: any): Promise<void> {
		try {
			await this.models.Autorole.remove({
				guild: data.guild,
				user: data.user,
				role: data.role,
				type: data.type,
				duration: data.duration
			});
		} catch (err) {
			this.logger.error(err, {
				type: 'autoroles.deleteAutorole.remove',
				guild: data.guild,
			});
		}
		this.autoroles.delete(`${data.guild}${data.user}${data.role}${data.duration}${data.type}`);
	}
}

import { Module } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as dyno from 'Dyno';
import * as commands from './commands';
import Credits from './Credits';
import GuildRank from './GuildRank';
import LeveledRoles from './LeveledRoles';
import Xp from './Xp';
/**
 * Level / Ranks Module
 * @class LevelsRanks
 * @extends Module
 */
class LevelsRanks extends Module {
	public module     : string   = 'LevelsRanks';
	public description: string   = 'Enables the leveling and ranking system for the guild';
	public enabled    : boolean  = true;
	public hasPartial : boolean  = false;
	public list       : boolean  = true;
	public commands   : {}       = commands;
	public _leveledRoles : LeveledRoles;
	public _xp : Xp;
	public _credits : Credits;
	public _guildrank : GuildRank;

	constructor(dynoInstance: dyno.Dyno) {
		super(dynoInstance);
		this.name = 'LevelsRanks';
		this._leveledRoles = new LeveledRoles(this);

		this.redisKeyConfig = {
			prefix: 'levelsranks',
			creditsPrefix: 'credits',
			xpPrefix: 'xp',
			guildPointsPrefix: 'guildpoints',
		};

		if (this.globalConfig.credits) {
			this.creditsConfig = this.globalConfig.credits;
		} else {
			const defaultConfig = {
				credits: {
					creditsGainCooldown: 120,
					creditsPerMsg: {
						min: 2,
						max: 3,
					},
				},
			};
			this.models.Dyno.update({}, { $set: defaultConfig });
			this.creditsConfig = defaultConfig.credits;
		}

		if (this.globalConfig.xp) {
			this.xpConfig = this.globalConfig.xp;
		} else {
			const defaultConfig = {
				xp: {
					xpGainCooldown: 120,
					xpPerMsg: {
						min: 5,
						max: 8,
					},
				},
			};
			this.models.Dyno.update({}, { $set: defaultConfig });
			this.xpConfig = defaultConfig.xp;
		}

		this._xp = new Xp(this, this.redisKeyConfig, this.xpConfig);
		this._credits = new Credits(this, this.redisKeyConfig, this.creditsConfig);
		this._guildrank = new GuildRank(this, this.redisKeyConfig);
	}

	get settings() : any {
		return {
			ranks: {
				pointsPerMsg: { type: Object, default: { min: 2, max: 5 } },
				pointsGainCooldown: { type: Number, default: 60 },
			},
		};
	}

	public start() : void {
		//shutup tslint
	}

	public async getGuildRank (userId : string, guildId : string) : Promise<{ position : number | string, count : number, points : string}> {
		const rankKey = `${this.redisKeyConfig.prefix}.${this.redisKeyConfig.guildPointsPrefix}.${guildId}.points`;

		let [[err1, position], [err2, count], [err3, points]] = await this.redis.multi()
												.zrevrank(rankKey, userId)
												.zcard(rankKey)
												.zscore(rankKey, userId)
											.exec();
		if (err1 || err2 || err3) {
			throw new Error(`Something went wrong when fetching from redis. ${err1} | ${err2} | ${err3}`);
		}

		if (position !== null) {
			position = Number.parseInt(position) + 1;
		}

		if (points) {
			points = Number.parseInt(points);
		} else {
			points = 0;
		}

		return {
			position,
			count,
			points,
		};
	}

	public async getGuildTop (guildId : string, from?: number, to?: number) : Promise<any> {
		const rankKey = `${this.redisKeyConfig.prefix}.${this.redisKeyConfig.guildPointsPrefix}.${guildId}.points`;

		const top = await this.redis.zrevrange(rankKey, from || 0, to || 9, 'WITHSCORES');
		const topList = [];

		let tmpObj : any = {};
		top.forEach((el : string, index : number) => {
			if (index % 2 === 0) {
				tmpObj.member = el;
			} else {
				tmpObj.points = Number.parseInt(el);
				topList.push(tmpObj);
				tmpObj = {};
			}
		});

		return topList;
	}

	/**
	 * Handle new message
	 * @param {Message} message Message object
	 * @returns {void}
	 */
	public async messageCreate({ message, guildConfig, command } : dyno.CommandData) : Promise<void> {
		if (!this.dyno.isReady || !guildConfig) {
			return;
		}

		const channel = <eris.GuildChannel> message.channel;
		const guild = channel.guild;

		if (!guild || !message.author || message.author.bot || !message.member) {
			return;
		}


		await this._credits.collectCredits(message);
		await this._xp.collectXp(message);


		if (!this.isEnabled(guild, this.module, guildConfig)) {
			return;
		}
		await this._guildrank.collectGuildPoints(message, guildConfig);
	}

}

module.exports = LevelsRanks;

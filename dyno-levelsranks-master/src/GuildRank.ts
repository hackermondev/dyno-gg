import { Module } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as dyno from 'Dyno';
import * as commands from './commands';
import LeveledRoles from './LeveledRoles';

/**
 * Handle Guild points collection
 * @class GuildRank
 */
export default class GuildRank {
	public module: any;
	private logger: any;
	private redis: any;
	private redisKeyConfig: any;
	private dyno: dyno.Dyno;
	private leveledRoles: any;
	private levelGap: number;
	private initialDifficulty: number;
	private coeficient: number;

	public constructor(module: any, redisKeyConfig: any) {
		this.module = module;
		this.logger = module.logger;
		this.redis = module.redis;
		this.redisKeyConfig = redisKeyConfig;
		this.leveledRoles = module._leveledRoles;
		this.dyno = module.dyno;

		// Level gap modifier
		this.levelGap = 4.4;

		// Initial level gap modifier
		this.initialDifficulty = -27;

		// Calculated value for proper level 1 start
		this.coeficient = Math.exp((1 - this.initialDifficulty) / this.levelGap);
	}

	public async collectGuildPoints(message: any, guildConfig: any): Promise<void> {
		const channel = <eris.GuildChannel>message.channel;
		const guild = channel.guild;
		const config = guildConfig.levelsranks.ranks;

		const cooldownKey = `${this.redisKeyConfig.prefix}.${this.redisKeyConfig.guildPointsPrefix}.cooldown.${message.author.id}`;
		const gpointsKey = `${this.redisKeyConfig.prefix}.${this.redisKeyConfig.guildPointsPrefix}.${guild.id}.points`;

		if (await this.dyno.redis.get(cooldownKey)) {
			return;
		}

		this.redis.set(cooldownKey, true, 'EX', config.pointsGainCooldown);

		const increment = this.getRandomNumber(config.pointsPerMsg.min, config.pointsPerMsg.max);

		try {
			const newScore = Number.parseInt(await this.redis.zincrby(gpointsKey, increment, message.author.id));
			await this.leveledRoles.checkRoleRequirements(message.member, newScore, guildConfig);
		} catch (err) {
			this.logger.error(err);
		}
	}

	public calcXp(level : number) {
		return Math.floor(Math.exp((level - this.initialDifficulty) / this.levelGap) - this.coeficient);
	}

	public calcLevel(xp : number) {
		return Math.max(Math.floor(this.levelGap * Math.log(xp + this.coeficient) + this.initialDifficulty), 1);
	}

	private getRandomNumber(min: number, max: number): number {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}
}

import { Module } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as dyno from 'Dyno';
import * as commands from './commands';
import LeveledRoles from './LeveledRoles';

/**
 * Handle Credits collection
 * @class Credits
 */
export default class Credits {
	public module : any;
	private logger : any;
	private redis : any;
	private redisKeyConfig : any;
	private dyno : dyno.Dyno;
	private creditsConfig : any;

	public constructor(module : any, redisKeyConfig : any, creditsConfig : any) {
		this.module = module;
		this.logger = module.logger;
		this.redis = module.redis;
		this.redisKeyConfig = redisKeyConfig;
		this.creditsConfig = creditsConfig;
		this.dyno = module.dyno;
	}

	public async collectCredits(message : any) : Promise<void> {
		const cooldownKey = `${this.redisKeyConfig.prefix}.${this.redisKeyConfig.creditsPrefix}.cooldown.${message.author.id}`;
		const creditsKey = `${this.redisKeyConfig.prefix}.${this.redisKeyConfig.creditsPrefix}.points`;

		if (await this.dyno.redis.get(cooldownKey)) {
			return;
		}

		this.redis.set(cooldownKey, true, 'EX', this.creditsConfig.creditsGainCooldown);

		const increment = this.getRandomNumber(this.creditsConfig.creditsPerMsg.min, this.creditsConfig.creditsPerMsg.max);

		try {
			await this.redis.zincrby(creditsKey, increment, message.author.id);
		} catch (err) {
			this.logger.error(err);
		}
	}

	public getCredits (userId : string) : Promise<number> {
		const creditsKey = `${this.redisKeyConfig.prefix}.${this.redisKeyConfig.creditsPrefix}.points`;
		return this.redis.zscore(creditsKey, userId);
	}

	private getRandomNumber(min : number, max : number) : number {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}
}

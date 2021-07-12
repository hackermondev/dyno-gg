import * as dyno from 'Dyno';

/**
 * Handle XP collection and levelup rules
 * @class Xp
 */
export default class Xp {
	public module : any;
	private logger : any;
	private redis : any;
	private redisKeyConfig : any;
	private dyno : dyno.Dyno;
	private xpConfig : any;
	private levelGap : number;
	private initialDifficulty : number;
	private coeficient : number;

	public constructor(module : any, redisKeyConfig : any, xpConfig : any) {
		this.module = module;
		this.logger = module.logger;
		this.redis = module.redis;
		this.redisKeyConfig = redisKeyConfig;
		this.xpConfig = xpConfig;
		this.dyno = module.dyno;

		// Level gap modifier
		this.levelGap = 4.4;

		// Initial level gap modifier
		this.initialDifficulty = -35;

		// Calculated value for proper level 1 start
		this.coeficient = Math.exp((1 - this.initialDifficulty) / this.levelGap);
	}

	public async collectXp(message : any) : Promise<void> {
		const cooldownKey = `${this.redisKeyConfig.prefix}.${this.redisKeyConfig.xpPrefix}.cooldown.${message.author.id}`;
		const xpKey = `${this.redisKeyConfig.prefix}.${this.redisKeyConfig.xpPrefix}.xp`;

		if (await this.dyno.redis.get(cooldownKey)) {
			return;
		}

		this.redis.set(cooldownKey, true, 'EX', this.xpConfig.xpGainCooldown);

		const increment = this.getRandomNumber(this.xpConfig.xpPerMsg.min, this.xpConfig.xpPerMsg.max);

		try {
			await this.redis.zincrby(xpKey, increment, message.author.id);
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

	private getRandomNumber(min : number, max : number) : number {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}
}

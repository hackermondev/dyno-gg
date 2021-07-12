interface Infraction {
	guild: eris.Guild,
	user: eris.User|eris.Member,
	count: number,
	createdAt: number,
}

interface LinkCooldown {
	guild: eris.Guild,
	user: eris.User|eris.Member,
	count: number,
	time: number,
	limit: number,
}

interface EmojiCooldown {
	guild: eris.Guild,
	user: eris.User|eris.Member,
	count: number,
	time: number,
	limit: number,
}

interface RateLimit {
	createdAt: number;
	ids: string[];
}

interface Warning {
	time: number;
	count: number;
}

interface FilterOptions {
	delete?: boolean,
	warn?: boolean,
	automute?: boolean,
	instantban?: boolean,
}

interface FilterEvent {
	message: eris.Message;
	guildConfig: dyno.GuildConfig;
	isAdmin: boolean;
}

interface LogEvent {
	message: eris.Message;
	filter: any;
	action?: string;
	type?: string;
	msgContent?: string;
	infraction?: number;
	reason?: string;
	guildConfig?: dyno.GuildConfig;
	modlog?: boolean;
}

interface ModerationArgs {
	msg: eris.Message;
	user: any;
	mod: eris.User;
	type: string;
	limit: number;
	role?: eris.Role;
	options?: any;
}

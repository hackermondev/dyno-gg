interface ManagerOptions {
	defaultRegion?: string;
	failoverRate?: number;
	failoverLimit?: number;
	player?: Player;
	reconnectThreshold?: number;
	regions?: RegionConfig;
}

interface RegionConfig {
	[key: string]: string[];
}

interface NodeConfig {
	host: string;
	port: number;
	region: string;
	numShards: number;
	userId: string;
	password: string;
}

interface JoinOptions {
	region?: string;
	[key: string]: any;
}

interface PendingGuild {
	channelId: string;
	options: any;
	player?: Player;
	node: Lavalink;
	res: Function;
	rej: Function;
	timeout: NodeJS.Timer;
	hostname?: string;
}

interface PendingGuilds {
	[key: string]: PendingGuild;
}
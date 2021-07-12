interface DynoConfig {
	version: string;
	state: number;
	stateName: string;
	collector: boolean;
	pkg: any;
	statsGuild: string;
	guildLog: string;
	largeGuildLog: string;
	shardIds: string[];
	clusterIds: string[];
	clusterCount: number;
	shardingStrategy: string;
	firstShardOverride: number;
	lastShardOverride: number;
	shardCountOverride: number;
	shardWebhook: string;
	cluster: any;
	handleRegion: boolean;
	regions: string[];

	paths: {[key: string]: string};
	client?: ClientConfig;
	site?: WebConfig;
	redis: {
		host: string;
		port: number;
		auth: string;
	}
	webhook: {
		host: string;
		port: number;
	}
	api: { baseurl: string }
	sentry: {
		dsn: string;
		logLevel: string;
	}
	permissions: {[key: string]: number};
	permissionsMap:{[key: string]: string};
	[key: string]: any;
}
interface ClientConfig {
	id: string;
	secret: string;
	token: string;
	userid: string;
	game: string;
	admin: string;
	fetchAllUsers: boolean;
	disableEveryone: boolean;
	maxCachedMessages: number;
	messageLogging: boolean;
	ws: {[key: string]: string|number};
}
interface WebConfig {
	host: string;
	port: number;
	listen_port: number;
	secret: string;
}
interface ClusterConfig {
	clusterId: number;
	shardCount: number;
	clusterCount: number;
	firstShardId: number;
	lastShardId: number;
	rootCtx: any;
	client: eris.Client;
	restClient: eris.Client;
}
interface GlobalConfig {
	prefix: string;
	commands: {[key: string]: boolean}
	modules: {[key: string]: boolean}
	webhooks: string[];
	dashAccess: string[];
	ignoredUsers: string[];
	nodes: NodeConfig[];
	[key: string]: any;
}
interface NodeConfig {
	host: string;
	name?: string;
	port?: string;
	region?: string;
	premium?: boolean;
}
interface GuildConfig {
	_id?: string;
	prefix?: string;
	modules: {[key: string]: boolean};
	commands: {[key: string]: boolean};
	subcommands?: {[key: string]: any};
	name?: string;
	iconURL?: string;
	ownerID?: string;
	region?: string;
	clientID?: string;
	lastActive?: number;
	timezone?: string;
	mods?: string[];
	modRoles?: string[];
	modonly?: boolean;
	deleted?: boolean;
	debug?: boolean;
	beta?: boolean;
	isPremium?: boolean;
	premiumInstalled?: boolean;
	ignoredUsers?: {[key: string]: any};
	ignoredRoles?: {[key: string]: any};
	ignoredChannels?: {[key: string]: any};
	cachedAt?: number;
	[key: string]: any;
}

interface Dyno {
	public isReady: boolean;
	public readonly client: eris.Client;
	public readonly restClient: eris.Client;
	public readonly config: DynoConfig;
	public readonly globalConfig: GlobalConfig;
	public readonly logger: any;
	public readonly models: any;
	public readonly redis: any;
	public readonly statsd: any;
	public readonly utils: Utils;
	[key: string]: any;
}

interface MessageEvent {
	message?: eris.Message;
	guild?: eris.Guild;
	guildConfig?: GuildConfig;
	isAdmin?: boolean;
	isOverseer?: boolean;
}

interface GuildEvent {
	guild?: eris.Guild;
	guildConfig?: GuildConfig;
}

interface RoleCreateEvent {
	guild?: eris.Guild;
	role: eris.Role;
	guildConfig: GuildConfig;
}

'use strict';

const path = require('path');
const getenv = require('getenv');
const pkg = require('../../package.json');

const basePath = path.resolve(path.join(__dirname, '..'));

require('dotenv').config({ silent: true });

if (!global.requireReload && !global.Loader) {
	global.requireReload = require('require-reload');
	global.Promise = require('bluebird');
}

/**
 * Base configuration object
 * @name config
 * @type {{
 *      name: string,
 *      author: string,
 *      version: string,
 *      lib: string,
 *      poweredBy: string,
 *      prefix: string,
 *      sudopref: string,
 *      contributors: [object]
 *      mentions: [object]
 *      test: boolean,
 *      beta: boolean,
 *      invite: string,
 *      shardCountOverride: number,
 *      logLevel: string
 *      youtubeKey: string,
 *      cryptkey: string,
 *      defaultPermissions: string,
 *      pkg: object,
 *      testGuilds: [string],
 *      betaGuilds: [string]
 *      paths: object,
 *      client: object,
 *      site: object,
 *      redis: object,
 *      api: object,
 *      sentry: object,
 *      emojis: object,
 *      carbon: object,
 *      dbots: object,
 *      announcements: object,
 *      automod: object,
 *      permissions: object
 * }}
 */
const config = {
	name:      'Dyno',
	author:    'NoobLance™#3500',
	version:   pkg.version,
	lib:       'eris',
	poweredBy: 'Dyno',
	prefix:    getenv('CLIENT_PREFIX', '?'),
	sudopref:  getenv('CLIENT_SUDOPREFIX', '$'),
	adminPrefix: getenv('CLIENT_ADMIN_PREFIX', 'd-'),
	overseers: [
		'77205340050956288', // carti
		'155700462119550976', // alt
	],
	contributors: [
		{ id: '77205340050956288', name: 'Carti [John]#0053', title: 'Dyno Overseer', desc: 'Community Overseer.' },
		{ id: '150061853001777154', name: 'abalabahaha#9421', title: 'Eris Dev', desc: 'The reason music works so well.' },
		{ id: '115076505549144067', name: 'Aurieh#0258', desc: 'Overwatch Command' },
		{ id: '131953641371205632', name: 'LunarSkies™#9337', desc: 'Former Community Manager.' },
		{ id: '85257659694993408', name: 'Macdja38#7770', desc: 'Sentry hosting and great ideas.' },
	],
	mentions: [
		{ name: 'Meowbeast#9337', desc: 'Motivating me to build this.' },
		{ name: 'Layanor#4169', desc: 'Invaluable early and continued feedback and support.' },
	],
	test:      getenv.bool('CLIENT_TEST', false),
	beta:      getenv.bool('CLIENT_BETA', false),
	isCore:    getenv.bool('CLIENT_CORE', false),
	isPremium: getenv.bool('CLIENT_PREMIUM', false),
	shared:    getenv.bool('CLIENT_SHARED', false),
	state:     getenv('CLIENT_STATE', 0),
	stateName: getenv('CLIENT_STATE_NAME', 'Live'),
	collector: getenv.bool('DATA_COLLECTOR', false),
	invite:    getenv('CLIENT_INVITE', 'https://discord.gg/9W6EG56'),
	logLevel:  getenv('CLIENT_LOGLEVEL', 'info'),
	youtubeKey: getenv('YT_APIKEY', ''),
	cryptkey: getenv('CRYPT_KEY'),
	defaultPermissions: '2097176631',
	pkg: pkg,
	dynoGuild: getenv('DYNO_GUILD', '203039963636301824'),
	statsGuild: getenv('STATS_GUILD', '301786438083805184'),
	guildLog: '205567372021465088',
	largeGuildLog: '243639503749775360',
	testGuilds: [
		'155149443606380545',
		'203039963636301824',
		'117093893345902593',
		'213019300783587328',
		'200167999267799040',
		'225569325535330305',
		'224170984083554304',
		'213000764048670722',
		'255388732746629120',
		'301786438083805184', // Dyno Testing
	],
	betaGuilds: [],
	avatar: 'images/dyno-v2-300.jpg',
	shardIds: process.env.SHARD_IDS ? process.env.SHARD_IDS.split(',') : [],
	clusterIds: process.env.CLUSTER_IDS ? process.env.CLUSTER_IDS.split(',') : [],
	clusterCount: process.env.CLUSTER_COUNT ? parseInt(process.env.CLUSTER_COUNT) : null,
	moduleList: process.env.MODULE_LIST ? process.env.MODULE_LIST.split(',') : [],
	shardingStrategy: process.env.SHARDING_STRATEGY || 'createShardsProcess',
	firstShardOverride: parseInt(process.env.FIRST_SHARD_OVERRIDE) || false,
	lastShardOverride: parseInt(process.env.LAST_SHARD_OVERRIDE) || false,
	shardCountOverride: parseInt(process.env.SHARD_COUNT_OVERRIDE) || false,
	discordLogger: {
		webhook: 'https://canary.discordapp.com/api/webhooks/263596728299683850/fygpIRg8pcD9nLPL2MxUjK8mupD6dnLfzA1eIwocoD_MnFzba1noE0sXY4XY_ZNfkPtt',
		name: 'Dyno Error',
	},
	shardWebhook: getenv('SHARD_WEBHOOK', 'https://canary.discordapp.com/api/webhooks/263596728299683850/fygpIRg8pcD9nLPL2MxUjK8mupD6dnLfzA1eIwocoD_MnFzba1noE0sXY4XY_ZNfkPtt'),
	cluster: {
		webhookUrl: getenv('CLUSTER_WEBHOOK', 'https://canary.discordapp.com/api/webhooks/264311177780264961/vih8r4CwQTUtOe1HIJj81J2gNtrhdI6z2wZ4vrpY42lVtmTZjKRwOjLk58JMXtZB0Wbk'),
	},
	disableHeartbeat: getenv.bool('CLIENT_DISABLE_HEARTBEAT', false),
	logCommands: getenv.bool('LOG_COMMANDS', false),
	handleRegion: getenv.bool('HANDLE_REGION', false),
	regions: process.env.REGIONS ? process.env.REGIONS.split(',') : [],
	disableEvents: process.env.DISABLE_EVENTS ? process.env.DISABLE_EVENTS.split(',') : [],
	enabledCommandGroups: process.env.ENABLED_COMMANDS || null,
	disabledCommandGroups: process.env.DISABLED_COMMANDS || null,
	disableHelp: getenv.bool('DISABLE_HELP', false),
	maxStreamLimit: 1300,
	streamLimitThreshold: 86400,
	statsdPrefix: getenv('STATSD_PREFIX', 'dyno.prod.'),
};

config.state = parseInt(config.state);

/**
 * Directory path configruation
 * @name config.paths
 * @type {{
 *      base: string,
 *      controllers: string,
 *      uploads: string,
 *      models: string,
 *      modules: string,
 *      commands: string,
 *      ipc: string,
 *      views: string,
 *      public: string,
 *      images: string
 * }}
 */
config.paths = {
	base:        basePath,
	commands:    path.join(basePath, 'commands'),
	controllers: path.join(basePath, 'controllers'),
	ipc:         path.join(basePath, 'ipc'),
	events:      path.join(basePath, 'events'),
	modules:     path.join(basePath, 'modules'),
};

/**
 * Client configuration
 * @name config.client
 * @type {{
 *      id: string,
 *      secret: string,
 *      token: string,
 *      admin: string,
 *      game: string,
 *      ws: {
 *          url: string,
 *          timeout: number
 *      },
 *      fetchAllUsers: boolean,
 *      disableEveryone: boolean,
 *      maxCachedMessages: number,
 *      messageLogging: boolean,
 * }}
 */
config.client = {
	id:     getenv('CLIENT_ID', ''),
	secret: getenv('CLIENT_SECRET', ''),
	token:  getenv('CLIENT_TOKEN', ''),
	game: 	getenv('CLIENT_GAME', 'https://dynobot.net | ?help'),
	admin:  getenv('ADMIN_ID', ''),
	fetchAllUsers: getenv.bool('CLIENT_FETCH_ALL_USERS', false),
	disableEveryone: getenv.bool('CLIENT_DISABLE_EVERYONE', false),
	maxCachedMessages: getenv('CLIENT_CACHED_MESSAGES', 10),
	messageLogging: getenv.bool('CLIENT_MESSAGE_LOGGING', false),
	ws: {
		port: getenv('CLIENT_WS_PORT', 5000),
		url: getenv('CLIENT_WS_URLS', 'ws://localhost:5000').split('|'),
		timeout: 5000,
	},
};

/**
 * Site configuration
 * @name config.site
 * @type {{
 *      host: string,
 *      port: number,
 *      listen_port: number,
 *      secret: string,
 *      statusChannel: string,
 *      statusMessage: string
 * }}
 */
config.site = {
	host:        getenv('SITE_HOST', 'http://localhost'),
	port:        getenv('SITE_PORT', 80),
	listen_port: getenv('SITE_LISTEN_PORT', 8000),
	secret:      getenv('SITE_SECRET', '229f38742e69c328ecff37e4db5c1c69'),
	statusChannel: getenv('SITE_STATUS_CHANNEL', '236168071318994945'),
	statusMessage: getenv('SITE_STATUS_MESSAGE', '236168141158350848'),
};

config.cleverbot = {
	key: getenv('CLEVERBOT_KEY'),
};

config.webhook = {
	host: getenv('WEBHOOK_HOST', 'http://localhost'),
	port: getenv('WEBHOOK_PORT', 5000),
};

/**
 * Redis configuration
 * @name config.redis
 * @type {{
 *      host: string,
 *      port: number,
 *      auth: string
 * }}
 */
config.redis = {
	host: getenv('CLIENT_REDIS_HOST', 'localhost'),
	port: getenv('CLIENT_REDIS_PORT', 6379),
	auth: getenv('CLIENT_REDIS_AUTH'),
};

/**
 * API configuration
 * @name config.api
 * @type {{ baseurl: string }}
 */
config.api = { baseurl: 'https://discordapp.com/api' };

/**
 * Sentry configuration
 * @name config.sentry
 * @type {{ dsn: string, logLevel: string }}
 */
config.sentry = {
	dsn: getenv('SENTRY_DSN'),
	logLevel: getenv('SENTRY_LOGLEVEL', 'error'),
};

/**
 * Emojis configuration
 * @name config.emojis
 * @type {{ error: string, success: string }}
 */
config.emojis = {
	success: '<:dynoSuccess:314691591484866560>',
	error:   '<:dynoError:314691684455809024>',
};

/**
 * Carbon configuration
 * @name config.carbon
 * @type {{ key: string, url: string, list: string }}
 */
config.carbon = {
	key: getenv('CARBON_KEY'),
	url: 'https://www.carbonitex.net/discord/data/botdata.php',
	list: 'https://www.carbonitex.net/discord/api/listedbots.php',
	info: 'https://www.carbonitex.net/discord/api/bot/info?id=155149108183695360',
};

/**
 * Discord bots configuration
 * @name config.dbots
 * @type {{ key: string, url: string }}
 */
config.dbots = {
	key: getenv('DBOTS_TOKEN'),
	url: 'https://bots.discord.pw/api/bots/155149108183695360/stats',
};

/**
 * Announcement default configuration
 * @name config.announcements
 * @type {{
 *      joinMessage: string,
 *      leaveMessage: string,
 *      banMessage: string
 * }}
 */
config.announcements = {
	joinMessage:  '_**{user} has joined.**_',
	leaveMessage: '_**{user} has left.**_',
	banMessage:   '_**{user} was banned.**_ :hammer:',
};

/**
 * Automod default configuration
 * @nane config.automod
 * @type {{ badwords: [string] }}
 */
config.automod = {
	logChannel: '250573039580741632',
	badwords: [
		'fuck', 'nigg', 'fuk', 'cunt', 'cnut', 'bitch',
		'dick', 'd1ck', 'pussy', 'asshole', 'b1tch',
		'b!tch', 'blowjob', 'cock', 'c0ck',
	],
};

/**
 * Permissions constants
 */
config.permissions = {
	// general
	createInstantInvite: 1,
    kickMembers:         1 << 1,
    banMembers:          1 << 2,
    administrator:       1 << 3,
    manageChannels:      1 << 4,
    manageGuild:         1 << 5,
    addReactions:        1 << 6,
    readMessages:        1 << 10,
    sendMessages:        1 << 11,
    sendTTSMessages:     1 << 12,
    manageMessages:      1 << 13,
    embedLinks:          1 << 14,
    attachFiles:         1 << 15,
    readMessageHistory:  1 << 16,
    mentionEveryone:     1 << 17,
    externalEmojis:      1 << 18,
    voiceConnect:        1 << 20,
    voiceSpeak:          1 << 21,
    voiceMuteMembers:    1 << 22,
    voiceDeafenMembers:  1 << 23,
    voiceMoveMembers:    1 << 24,
    voiceUseVAD:         1 << 25,
    changeNickname:      1 << 26,
    manageNicknames:     1 << 27,
    manageRoles:         1 << 28,
    manageWebhooks:      1 << 29,
    manageEmojis:        1 << 30,
};

config.permissionsMap = {
	createInstantInvite: 'Create Instant Invite',
    kickMembers:         'Kick Members',
    banMembers:          'Ban Members',
    administrator:       'Administrator',
    manageChannels:      'Manage Channels',
    manageGuild:         'Manage Server',
    addReactions:        'Add Reactions',
    readMessages:        'Read Messages',
    sendMessages:        'Send Messages',
    sendTTSMessages:     'Send TTS Messages',
    manageMessages:      'Manage Messages',
    embedLinks:          'Embed Links',
    attachFiles:         'Attach Files',
    readMessageHistory:  'Read Message History',
    mentionEveryone:     'Mention Everyone',
    externalEmojis:      'External Emojis',
    voiceConnect:        'Connect',
    voiceSpeak:          'Speak',
    voiceMuteMembers:    'Mute Members',
    voiceDeafenMembers:  'Deafen Members',
    voiceMoveMembers:    'Move Members',
    voiceUseVAD:         'Use Voice Activity',
    changeNickname:      'Change Nickname',
    manageNicknames:     'Manage Nicknames',
    manageRoles:         'Manage Roles',
    manageWebhooks:      'Manage Webhooks',
    manageEmojis:        'Manage Emojis',
};

module.exports = config;

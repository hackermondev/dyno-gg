'use strict';

const path = require('path');
const getenv = require('getenv');
const pkg = require('../../package.json');

const basePath = path.resolve(path.join(__dirname, '..'));

require('dotenv').config({ silent: true });

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
	prefix:    '?',
	sudopref:  '$',
	invite:    getenv('CLIENT_INVITE', 'https://discord.gg/9W6EG56'),
	logLevel:  getenv('CLIENT_LOGLEVEL', 'info'),
	cryptkey:  getenv('CRYPT_KEY'),
	defaultPermissions: '2097176631',
	pkg: pkg,
	overseers: [
		'77205340050956288', // carti
		'155700462119550976', // alt
	],
	testGuilds: [
		'155149443606380545',
		'203039963636301824',
		'117093893345902593',
		'213019300783587328',
		'200167999267799040',
		'225569325535330305',
		'224170984083554304',
		'213000764048670722',
	],
	betaGuilds: [],
	avatar: 'images/dyno-v2-300.jpg',
};

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
	controllers: path.join(basePath, 'controllers'),
	images:      path.join(basePath, '..', 'public/images'),
	public:      path.join(basePath, '..', 'public'),
	views:       path.join(basePath, '..', 'views'),
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
	userid: getenv('CLIENT_USER_ID', '155149108183695360'),
	admin:  getenv('ADMIN_ID', ''),
	cache: {
		limit: getenv('CLIENT_CACHE_LIMIT', 60000),
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
	listen_port: getenv('SITE_LISTEN_PORT', 9337),
	secret:      getenv('SITE_SECRET', '229f38742e69c328ecff37e4db5c1c69'),
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
	dsn: process.env.SENTRY_DSN,
	logLevel: getenv('SENTRY_LOGLEVEL', 'error'),
};

/**
 * Emojis configuration
 * @name config.emojis
 * @type {{ error: string, success: string }}
 */
config.emojis = {
	success: ':ok_hand:',
	error:   ':fire:',
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
	createInstantInvite: 1 << 0,
	kickMembers:         1 << 1,
	banMembers:          1 << 2,
	administrator:       1 << 3,
	manageChannels:      1 << 4,
	manageChannel:       1 << 4,
	manageServer:        1 << 5,
	changeNickname:      1 << 26,
	manageNicknames:     1 << 27,
	manageRoles:         1 << 28,
	managePermissions:   1 << 28,
	// text
	readMessages:        1 << 10,
	sendMessages:        1 << 11,
	sendTTSMessages:     1 << 12,
	manageMessages:      1 << 13,
	embedLinks:          1 << 14,
	attachFiles:         1 << 15,
	readMessageHistory:  1 << 16,
	mentionEveryone:     1 << 17,
	// voice
	voiceConnect:        1 << 20,
	voiceSpeak:          1 << 21,
	voiceMuteMembers:    1 << 22,
	voiceDeafenMembers:  1 << 23,
	voiceMoveMembers:    1 << 24,
	voiceUseVAD:         1 << 25,
};

module.exports = config;

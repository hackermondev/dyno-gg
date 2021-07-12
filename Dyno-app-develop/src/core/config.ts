import * as getenv from 'getenv';
import * as path from 'path';

const basePath = path.resolve(path.join(__dirname, '..', '..'));
const pkg = require('../../package.json');

require('dotenv').config({ silent: true });

const config: DynoConfig = {
	get: (key: string, defaultValue: any) => {
		if (config[key]) {
			return config[key];
		}
		return getenv(key, defaultValue);
	},
	version:   pkg.version,
	state:     parseInt(getenv('CLIENT_STATE', 0), 10),
	stateName: getenv('CLIENT_STATE_NAME', 'Live'),
	collector: getenv.bool('DATA_COLLECTOR', false),
	pkg: pkg,
	statsGuild: getenv('STATS_GUILD', '301786438083805184'),
	guildLog: '205567372021465088',
	largeGuildLog: '243639503749775360',
	shardIds: process.env.SHARD_IDS ? process.env.SHARD_IDS.split(',') : [],
	clusterIds: process.env.CLUSTER_IDS ? process.env.CLUSTER_IDS.split(',') : [],
	clusterCount: process.env.CLUSTER_COUNT ? parseInt(process.env.CLUSTER_COUNT, 10) : null,
	shardingStrategy: process.env.SHARDING_STRATEGY || 'createShardsProcess',
	firstShardOverride: parseInt(process.env.FIRST_SHARD_OVERRIDE, 10) || null,
	lastShardOverride: parseInt(process.env.LAST_SHARD_OVERRIDE, 10) || null,
	shardCountOverride: parseInt(process.env.SHARD_COUNT_OVERRIDE, 10) || null,
	shardWebhook: getenv('SHARD_WEBHOOK',
		'https://canary.discordapp.com/api/webhooks/263596728299683850/fygpIRg8pcD9nLPL2MxUjK8mupD6dnLfzA1eIwocoD_MnFzba1noE0sXY4XY_ZNfkPtt'),
	cluster: {
		webhookUrl: getenv('CLUSTER_WEBHOOK',
		'https://canary.discordapp.com/api/webhooks/264311177780264961/vih8r4CwQTUtOe1HIJj81J2gNtrhdI6z2wZ4vrpY42lVtmTZjKRwOjLk58JMXtZB0Wbk'),
	},
	handleRegion: getenv.bool('HANDLE_REGION', false),
	regions: process.env.REGIONS ? process.env.REGIONS.split(',') : [],
	paths: {
		base:        basePath,
		commands:    path.join(basePath, 'src/commands'),
		ipc:         path.join(basePath, 'src/ipc'),
		events:      path.join(basePath, 'src/events'),
		modules:     path.join(basePath, 'src/modules'),
		translations: path.join(basePath, 'translations'),
	},
	site: {
		host:        getenv('SITE_HOST', 'http://localhost'),
		port:        getenv('SITE_PORT', 80),
		listen_port: getenv('SITE_LISTEN_PORT', 8000),
		secret:      getenv('SITE_SECRET', '229f38742e69c328ecff37e4db5c1c69'),
	},
	redis: {
		host: getenv('CLIENT_REDIS_HOST', 'localhost'),
		port: getenv('CLIENT_REDIS_PORT', 6379),
		auth: getenv('CLIENT_REDIS_AUTH'),
	},
	sentry: {
		dsn: getenv('SENTRY_DSN'),
		logLevel: getenv('SENTRY_LOGLEVEL', 'error'),
	},
	webhook: {
		host: getenv('WEBHOOK_HOST', 'http://localhost'),
		port: getenv('WEBHOOK_PORT', 5000),
	},
	dbots: {
		key: getenv('DBOTS_TOKEN'),
		url: 'https://bots.discord.pw/api/bots/155149108183695360/stats',
	},
	permissions: {
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
	},
	permissionsMap: {
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
	},
	api: { baseurl: 'https://discordapp.com/api' },
};

export default config;

'use strict';

const path = require('path');
const pkg = require('../../package.json');

const basePath = path.resolve(path.join(__dirname, '..'));

const config = require('config');

config.paths = {
	base:        basePath,
	commands:    path.join(basePath, 'commands'),
	controllers: path.join(basePath, 'controllers'),
	ipc:         path.join(basePath, 'ipc'),
	events:      path.join(basePath, 'events'),
	modules:     path.join(basePath, 'modules'),
};

config.pkg = pkg;

config.permissions = {
	createInstantInvite: 1,
	kickMembers: 2,
	banMembers: 4,
	administrator: 8,
	manageChannels: 16,
	manageGuild: 32,
	addReactions: 64,
	readMessages: 1024,
	sendMessages: 2048,
	sendTTSMessages: 4096,
	manageMessages: 8192,
	embedLinks: 16384,
	attachFiles: 32768,
	readMessageHistory: 65536,
	mentionEveryone: 131072,
	externalEmojis: 262144,
	voiceConnect: 1048576,
	voiceSpeak: 2097152,
	voiceMuteMembers: 4194304,
	voiceDeafenMembers: 8388608,
	voiceMoveMembers: 16777216,
	voiceUseVAD: 33554432,
	changeNickname: 67108864,
	manageNicknames: 134217728,
	manageRoles: 268435456,
	manageWebhooks: 536870912,
	manageEmojis: 1073741824,
};

config.permissionsMap = {
	createInstantInvite: 'Create Instant Invite',
	kickMembers: 'Kick Members',
	banMembers: 'Ban Members',
	administrator: 'Administrator',
	manageChannels: 'Manage Channels',
	manageGuild: 'Manage Server',
	addReactions: 'Add Reactions',
	readMessages: 'Read Messages',
	sendMessages: 'Send Messages',
	sendTTSMessages: 'Send TTS Messages',
	manageMessages: 'Manage Messages',
	embedLinks: 'Embed Links',
	attachFiles: 'Attach Files',
	readMessageHistory: 'Read Message History',
	mentionEveryone: 'Mention Everyone',
	externalEmojis: 'External Emojis',
	voiceConnect: 'Connect',
	voiceSpeak: 'Speak',
	voiceMuteMembers: 'Mute Members',
	voiceDeafenMembers: 'Deafen Members',
	voiceMoveMembers: 'Move Members',
	voiceUseVAD: 'Use Voice Activity',
	changeNickname: 'Change Nickname',
	manageNicknames: 'Manage Nicknames',
	manageRoles: 'Manage Roles',
	manageWebhooks: 'Manage Webhooks',
	manageEmojis: 'Manage Emojis',
};

module.exports = config;

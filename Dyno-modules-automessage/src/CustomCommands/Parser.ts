import {Base} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as dyno from 'Dyno';
import * as moment from 'moment-timezone';
import {default as CustomCommands} from './index';

export default class Parser extends Base {
	public module: CustomCommands;

	private channelRegex: RegExp = new RegExp('{#([a-zA-Z0-9-_]+)}', 'g');
	private roleRegex: RegExp = new RegExp('{&([a-zA-Z0-9-_ ]+)}', 'g');
	private userRegex: RegExp = new RegExp('{@(.*)}', 'g');

	constructor(module: CustomCommands) {
		super(module.dyno);
		this.module = module;
	}

	public parse(content: string, data: any, mentionUser: boolean = true) {
		if (!content) { return; }

		const time = moment().tz(data.guildConfig.timezone || 'America/New_York');
		const rules = [
			{ str: '{date}',      match: /{date}/gi, replace: time.format('MMM DD, YYYY') },
			{ str: '{time}',      match: /{time}/gi, replace: time.format('HH:mm:ss') },
			{ str: '{datetime}',  match: /{datetime}/gi, replace: time.format('MMM DD, YYYY HH:mm:ss') },
			{ str: '{time12}',    match: /{time12}/gi, replace: time.format('hh:mm:ss a') },
			{ str: '{datetime12}', match: /{datetime12}/gi, replace: time.format('MMM DD, YYYY hh:mm:ss a') },
			{ str: '{everyone}',  match: /{everyone}/gi, replace: '@everyone' },
			{ str: '{here}',      match: /{here}/gi, replace: '@here' },
			{ str: '{prefix}',    match: /{prefix}/gi, replace: data.guildConfig.prefix },
			{ str: '{server}',    match: /{server}/gi, replace: data.guild.name },
			{ str: '{channel}',   match: /{channel}/gi, replace: data.channel.mention },
			{ str: '{user}',      match: /{user}/gi, replace: mentionUser ? data.user.mention : this.utils.fullName(data.user) },
			{ str: '{urlencode:', match: /{urlencode:(.*)/gi, replace: (_: any, val: string) => encodeURIComponent(val) },
			{ str: '{user.',      match: /{user\.([\w\d]+)}/gi, replace: this.parseProperties.bind(this, data, 'user') },
			{ str: '{server.',    match: /{server\.([\w\d]+)}/gi, replace: this.parseProperties.bind(this, data, 'guild') },
			{ str: '{channel.',   match: /{channel\.([\w\d]+)}/gi, replace: this.parseProperties.bind(this, data, 'channel') },
			{ str: '{#',          match: /{#([a-zA-Z0-9-_]+)}/g, replace: this.parseMention.bind(this, data, 'channels') },
			{ str: '{&',          match: /{&([a-zA-Z0-9-_ ]+)}/g, replace: this.parseMention.bind(this, data, 'roles') },
			{ str: '{@',          match: /{@(.*)}/g, replace: this.parseMention.bind(this, data, 'members') },
			{ str: '{choose:',    match: /{choose:([^}]*)}/g, replace: this.choose.bind(this, data) },
			{ str: '{choice}',    match: /{choice}/g, replace: this.choice.bind(this, data) },
		];

		for (const rule of rules) {
			if (content.includes(rule.str)) {
				content = content.replace(rule.match, rule.replace);
			}
		}

		return content;
	}

	private choose(data: any, match: any, value: string) {
		if (value) {
			data.choices = value.replace(/\s?;\s?/g, ';').split(';');
			data.choice = data.choices[Math.floor(Math.random() * data.choices.length)];
		}
		return '';
	}

	private choice(data: any) {
		return data.choice || '';
	}

	private parseMention(data: any, collection: string, match: any, value: string) {
		const result = data.guild[collection].find((d: any) => (d.name && d.name === value) || (d.username && d.username === value));
		return result ? result.mention : '';
	}

	private parseProperties(data: any, cache: string, match: any, key: string) {
		if (!data[cache]) { return ''; }
		if (cache === 'user' && key === 'name') {
			return this.utils.fullName(data[cache]);
		}
		if (key === 'joinedAt' || key === 'createdAt') {
			return moment.unix(data[cache][key] / 1000).format('llll');
		}
		if (key === 'discrim') {
			return data[cache].discriminator;
		}
		if (key === 'icon') {
			return data[cache].iconURL;
		}
		if (key === 'avatar') {
			return data[cache].avatarURL;
		}
		if (!data[cache][key] || (typeof data[cache][key] !== 'string' && typeof data[cache][key] !== 'number')) {
			return '';
		}

		return data[cache][key];
	}
}

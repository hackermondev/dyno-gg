import {Base} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as dyno from 'Dyno';
import * as moment from 'moment-timezone';
import CustomCommands from './CustomCommands';

export default class Parser extends Base {
	public module: CustomCommands;

	private channelRegex: RegExp = new RegExp('{#([a-zA-Z0-9-_]+)}', 'g');
	private roleRegex: RegExp = new RegExp('{&([^}]+)}', 'g');
	private userRegex: RegExp = new RegExp('{@([^}]+)}', 'g');

	private argsRegex: RegExp = new RegExp(/\$([0-9\+]+)/, 'g');
	private argUserRegex: RegExp = new RegExp(/\$([0-9]+)\.user\.([a-zA-Z]+)/, 'g');
	private argRoleRegex: RegExp = new RegExp(/\$([0-9]+)\.role\.([a-zA-Z]+)/, 'g');
	private argChannelRegex: RegExp = new RegExp(/\$([0-9]+)\.channel\.([a-zA-Z]+)/, 'g');

	constructor(module: CustomCommands) {
		super(module.dyno);
		this.module = module;
	}

	public parse(message: eris.Message, channel: any, content: string, data: any, mentionUser: boolean = true) {
		if (!content) { return; }

		const params = message.content.split(' ');
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
			{ str: '{#',          match: /{#([^}]+)}/g, replace: this.parseMention.bind(this, data, 'channels') },
			{ str: '{&',          match: /{&([^}]+)}/g, replace: this.parseMention.bind(this, data, 'roles') },
			{ str: '{@',          match: /{@(.*)}/g, replace: this.parseMention.bind(this, data, 'members') },
			{ str: '{choose',     match: /{choose([0-9]+)?:([^}]*)}/g, replace: this.choose.bind(this, data) },
			{ str: '{choice',     match: /{choice([0-9]+)?}/g, replace: this.choice.bind(this, data) },
		];

		content = content.replace(this.argUserRegex, (match: any, index: any, key: any) => {
			if (params.slice(1).length < index) { return ''; }

			const r = this.parseArgs(params, index);
			if (!r) {
				return '';
			}

			const user = this.resolveUser((<eris.GuildChannel>message.channel).guild, r);
			const result = this.parseArgProperties(user, key, 'user');
			if (result != undefined) {
				return result;
			}

			return user[key];
		});

		content = content.replace(this.argRoleRegex, (match: any, index: any, key: any) => {
			if (params.slice(1).length < index) { return ''; }

			const r = this.parseArgs(params, index);
			if (!r) {
				return '';
			}

			const role = this.resolveRole((<eris.GuildChannel>message.channel).guild, r);
			const result = this.parseArgProperties(role, key);
			if (result != undefined) {
				return result;
			}

			return role[key];
		});

		content = content.replace(this.argChannelRegex, (match: any, index: any, key: any) => {
			if (params.slice(1).length < index) { return ''; }

			const r = this.parseArgs(params, index);
			if (!r) {
				return '';
			}

			const chan = this.resolveChannel((<eris.GuildChannel>message.channel).guild, r);
			const result = this.parseArgProperties(channel, key);
			if (result != undefined) {
				return result;
			}

			return chan[key];
		});

		content = content.replace(this.argsRegex, (match: any, index: any) => {
			if (params.slice(1).length < index) { return; }

			return this.parseArgs(params, index);
		});

		for (const rule of rules) {
			if (content.includes(rule.str)) {
				content = content.replace(rule.match, rule.replace);
			}
		}

		return content;
	}

	private parseArgs(params: string[], index: any) {
		let r;

		if (index.includes('+')) {
			index = parseInt(index.replace('+', ''), 10);
			r = params.slice(1).slice(--index).join(' ');
		} else {
			r = params.slice(1)[--index];
		}

		r = r && r.replace(/({|})/g, '');

		return r || '';
	}

	private parseArgProperties(data: any, key: string, cache: string = '') {
		if (!data) {
			return '';
		}

		if (typeof data[key] !== 'string' && typeof data[key] !== 'number') {
			return '';
		}

		if (cache === 'user' && key === 'name') {
			return this.utils.fullName(data[key]);
		}
		if (key === 'nick') {
			return data.nick || data.username;
		}
		if (key === 'joinedAt' || key === 'createdAt' && data[key]) {
			return moment.unix(data[key] / 1000).format('llll');
		}
		if (key === 'discrim') {
			return data.discriminator;
		}
		if (key === 'icon') {
			return data.iconURL;
		}
		if (key === 'avatar') {
			return data.avatarURL;
		}
		if (key === 'color') {
			return (`00000${data.color.toString(16)}`).slice(-6);
		}
	}

	private parseProperties(data: any, cache: string, match: any, key: string) {
		if (!data[cache]) { return ''; }
		if (cache === 'user' && key === 'name') {
			return this.utils.fullName(data[cache]);
		}
		if (key === 'nick') {
			return data.nick || data.username;
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

	private choose(data: any, match: any, index: string, value: string) {
		const i = index || 0;
		if (value) {
			data.choices = data.choices || [];
			data.choice = data.choice || [];
			data.choices[i] = value.replace(/\s?;\s?/g, ';').split(';');
			data.choice[i] = data.choices[i][Math.floor(Math.random() * data.choices[i].length)];
		}
		return '';
	}

	private choice(data: any, match: any, index: number) {
		const i = index || 0;
		return data.choice[i] || '';
	}

	private parseMention(data: any, collection: string, match: any, value: string) {
		const result = data.guild[collection].find((d: any) => (d.name && d.name === value) || (d.username && d.username === value));
		return result ? result.mention : '';
	}
}

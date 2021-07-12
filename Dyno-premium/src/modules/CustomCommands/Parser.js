'use strict';

const moment = require('moment');
const Base = Loader.require('./core/structures/Base');
const utils = Loader.require('./core/utils');

class Parser extends Base {
    constructor(module) {
        super();
        this.module = module;

        this.channelRegex = new RegExp('{#([a-zA-Z0-9-_]+)}', 'g');
        this.roleRegex = new RegExp('{&([a-zA-Z0-9-_ ]+)}', 'g');
        this.userRegex = new RegExp('{@(.*)}', 'g');
    }

    parse(content, data, mentionUser = true) {
        if (!content) return;

        const time = moment();
        const rules = [
            { str: '{date}',      match: /{date}/gi, replace: time.format('MMM DD, YYYY') },
            { str: '{time}',      match: /{time}/gi, replace: time.format('HH:mm:ss') },
            { str: '{datetime}',  match: /{datetime}/gi, replace: time.format('MMM DD, YYYY HH:mm:ss') },
            { str: '{time12}',    match: /{time12}/gi, replace: time.format('hh:mm:ss a') },
            { str: '{datetime12}',match: /{datetime12}/gi, replace: time.format('MMM DD, YYYY hh:mm:ss a') },
            { str: '{everyone}',  match: /{everyone}/gi, replace: '@everyone' },
            { str: '{here}',      match: /{here}/gi, replace: '@here' },
            { str: '{prefix}',    match: /{prefix}/gi, replace: data.guildConfig.prefix },
            { str: '{server}',    match: /{server}/gi, replace: data.guild.name },
            { str: '{channel}',   match: /{channel}/gi, replace: data.channel.mention },
            { str: '{user}',      match: /{user}/gi, replace: mentionUser ? data.user.mention : utils.fullName(data.user) },
            { str: '{urlencode:', match: /{urlencode:(.*)/gi, replace: (_, val) => encodeURIComponent(val) },
            { str: '{user.',      match: /{user\.([\w\d]+)}/gi, replace: this.parseProperties.bind(this, data, 'user') },
            { str: '{server.',    match: /{server\.([\w\d]+)}/gi, replace: this.parseProperties.bind(this, data, 'guild') },
            { str: '{channel.',   match: /{channel\.([\w\d]+)}/gi, replace: this.parseProperties.bind(this, data, 'channel') },
            { str: '{#',          match: /{#([a-zA-Z0-9-_]+)}/g, replace: this.parseMention.bind(this, data, 'channels') },
            { str: '{&',          match: /{&([a-zA-Z0-9-_ ]+)}/g, replace: this.parseMention.bind(this, data, 'roles') },
            { str: '{@',          match: /{@(.*)}/g, replace: this.parseMention.bind(this, data, 'members') },
            { str: '{choose:',    match: /{choose:([^}]*)}/g, replace: this.choose.bind(this, data) },
            { str: '{choice}',    match: /{choice}/g, replace: this.choice.bind(this, data) },
        ];

        for (let rule of rules) {
            if (content.includes(rule.str)) {
                content = content.replace(rule.match, rule.replace);
            }
        }

        return content;
    }

    choose(data, match, value) {
        if (value) {
            data.choices = value.replace(/\s?;\s?/g, ';').split(';');
            data.choice = data.choices[Math.floor(Math.random() * data.choices.length)];
        }
        return '';
    }

    choice(data) {
        return data.choice || '';
    }

    parseMention(data, collection, match, value) {
        let result = data.guild[collection].find(d => (d.name && d.name === value) || (d.username && d.username === value));
        return result ? result.mention : '';
    }

    parseProperties(data, cache, match, key) {
        console.log(cache, key);
        if (!data[cache]) return '';
        if (cache === 'user' && key === 'name') {
            return utils.fullName(data[cache]);
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

module.exports = Parser;

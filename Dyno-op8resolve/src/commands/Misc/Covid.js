'use strict';

const { Command } = require('@dyno.gg/dyno-core');
const axios = require('axios');
const formatNumber = require('simple-format-number');

class Covid extends Command {
	constructor(...args) {
		super(...args);

		this.aliases = ['covid', 'coronavirus', 'corona', 'cv'];
		this.group = 'Misc';
		this.description = 'Get COVID-19 stats.';
		this.defaultCommand = 'all';
		this.defaultUsage = 'covid';
		this.cooldown = 6000;
		this.expectedArgs = 0;

		this.commands = [
			{ name: 'all', desc: 'Get global stats.', default: true, usage: 'all' },
			{ name: 'country', desc: 'Get stats for a country.', usage: 'country [country]' },
			{ name: 'state', desc: 'Get stats for a US state.', usage: 'state [state]' },
			{ name: 'top', desc: 'List top countries by cases.', usage: 'top' },
		];

		this.usage = [
			'covid',
			'covid [country]',
			'covid [state]',
			'covid country [country]',
			'covid state [state]',
		]

		this.example = [
			'covid',
			'covid USA',
			'covid New York',
		];
	}

	async getCovid({ endpoint, query }) {
		const url = `https://corona.lmao.ninja/${endpoint || 'all'}`;
		let data;
		try {
			data = await this.redis.get(url);
			if (!data) {
				const response = await axios.get(url);
				if (response && response.data) {
					data = response.data;
					data.timestamp = (new Date()).toISOString();
					this.redis.setex(url, 60, JSON.stringify(data));
				} else {
					return Promise.reject(`Unable to get data.`);
				}
			} else {
				data = JSON.parse(data);
			}
		} catch (err) {
			const response = await axios.get(url);
			if (response && response.data) {
				data = response.data;
				data.timestamp = (new Date()).toISOString();
				this.redis.setex(url, 90, JSON.stringify(data));
			} else {
				return Promise.reject(`Unable to get data.`);
			}
		}

		if (query) {
			query = query.toLowerCase();
			query = query === 'us' ? 'usa' : query;
			const result = data.find(d => (d.country && d.country.toLowerCase() === query) || (d.state && d.state.toLowerCase() === query));
			if (!result) {
				return Promise.reject(`Unable to find results for ${query}.`);
			}

			return result;
		}

		return data;
	}

	execute() {
		return Promise.resolve();
	}

	async all({ message, args }) {
		try {
			let data;
			if (args && args.length) {
				data = await this.getCovid({ endpoint: 'countries', query: args.join(' ') }).catch(() => null);
				if (!data) {
					data = await this.getCovid({ endpoint: 'states', query: args.join(' ') }).catch(() => null);
				}
			}
			if (!data) {
				data = await this.getCovid({});
			}

			return this.postEmbed(data, message.channel);
		} catch (err) {
			return this.error(message.channel, err);
		}
	}

	async country({ message, args }) {
		try {
			if (!args || !args.length) {
				return this.error(message.channel, 'Provide a country to look up.');
			}
			const data = await this.getCovid({ endpoint: 'countries', query: args.join(' ') });
			return this.postEmbed(data, message.channel);
		} catch (err) {
			return this.error(message.channel, err);
		}
	}

	async state({ message, args }) {
		try {
			const data = await this.getCovid({ endpoint: 'states', query: args.join(' ') });
			return this.postEmbed(data, message.channel);
		} catch (err) {
			return this.error(message.channel, err);
		}
	}

	async top({ message, args }) {
		try {
			let data = await this.getCovid({ endpoint: 'countries', query: args.join(' ') });
			data = data.slice(0, 10);
			const embed = {
				color: this.utils.hexToInt('1D1D1D'),
				title: `COVID-19 Statistics`,
				fields: [],
				thumbnail: { url: 'https://cdn.discordapp.com/attachments/239446877953720321/691020838379716698/unknown.png' },
			};

			embed.fields = data.map(d => ({
				name: d.country,
				value: `${this.formatNumber(d.cases)} cases ${this.formatNumber(d.deaths)} deaths ${this.formatNumber(d.recovered)} recovered`,
			}));

			return this.sendMessage(message.channel, { embed });
		} catch (err) {
			return this.error(message.channel, err);
		}
	}

	formatNumber(n) {
		return formatNumber(n, { fractionDigits: 0 });
	}

	postEmbed(data, channel) {
		const type = data.state ? `${data.state} (State)` : data.country ? `${data.country} (Country)` : 'Global';
		const embed = {
			color: this.utils.hexToInt('1D1D1D'),
			title: `COVID-19 Statistics for ${type}`,
			fields: [
				{ name: 'Cases', value: this.formatNumber(data.cases), inline: true },
			],
			thumbnail: { url: 'https://cdn.discordapp.com/attachments/239446877953720321/691020838379716698/unknown.png' },
		};

		if (data.deaths != undefined) {
			embed.fields.push({ name: 'Deaths', value: `${this.formatNumber(data.deaths)}${data.deaths > 1000 ? '\n' : ' '}(${((data.deaths / data.cases) * 100).toFixed(2)}%)`, inline: true });
		}

		if (data.recovered != undefined) {
			embed.fields.push({ name: 'Recovered', value: `${this.formatNumber(data.recovered)}${data.recovered > 1000 ? '\n' : ' '}(${((data.recovered / data.cases) * 100).toFixed(2)}%)`, inline: true });
		}

		if (data.active != undefined) {
			embed.fields.push({ name: 'Active', value: `${this.formatNumber(data.active)}${data.active > 1000 ? '\n' : ' '}(${((data.active / data.cases) * 100).toFixed(2)}%)`, inline: true });
		}
		if (data.critical != undefined) {
			embed.fields.push({ name: 'Critical', value: `${this.formatNumber(data.critical)}${data.critical > 1000 ? '\n' : ' '}(${((data.critical / data.cases) * 100).toFixed(2)}%)`, inline: true });
		}
		if (data.todayCases != undefined) {
			embed.fields.push({ name: 'Cases Today', value: this.formatNumber(data.todayCases), inline: true });
		}
		if (data.todayDeaths != undefined) {
			embed.fields.push({ name: 'Deaths Today', value: this.formatNumber(data.todayDeaths), inline: true });
		}
		if (data.casesPerOneMillion != undefined) {
			embed.fields.push({ name: 'Cases per million', value: this.formatNumber(data.casesPerOneMillion), inline: true });
		}

		embed.fields.push({ name: 'Help Stop Coronavirus', value: '[Advice for Public](https://www.who.int/emergencies/diseases/novel-coronavirus-2019/advice-for-public)' });

		return this.sendMessage(channel, { embed });
	}
}

module.exports = Covid;

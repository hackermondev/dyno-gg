'use strict';

const google = Loader.require('google');
const Command = Loader.require('./core/structures/Command');

class Google extends Command {
	constructor(...args) {
		super(...args);

		this.aliases = ['google', 'g'];
		this.group = 'Misc';
		this.description = 'Get search results from google';
		this.usage = 'google [search string]';
		this.cooldown = 3000;
		this.expectedArgs = 1;
	}

	google(query) {
		return new Promise((resolve, reject) => {
			google(query, (err, res) => {
				if (err) return reject(err);
				return resolve(res);
			});
		});
	}

	async execute({ message, args }) {
		let link = {};

		google.resultsPerPage = 10;

		try {
			const res = await this.google(args.join(' '));

			if (!res.links.length) {
				return this.sendMessage(message.channel, `I didn't get any results.`);
			}

			while (!link.href && res.links.length) {
				link = res.links.shift();
			}

			this.sendMessage(message.channel, link.href);

			link = {};

			return Promise.resolve();
		} catch (err) {
			return this.error(message.channel, `I didn't get any results.`);
		}
	}
}

module.exports = Google;

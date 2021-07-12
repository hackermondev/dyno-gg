import { Command, CommandData } from '@dyno.gg/dyno-core';
import * as superagent from 'superagent';

export default class Github extends Command {
	public aliases     : string[] = ['github', 'gh'];
	public module      : string   = 'Fun';
	public description : string   = 'Get info on a Github repository.';
	public usage	   : string[] = ['github [repo name]', 'github [owner]/[repo name]'];
	public example	   : string[] = ['github linux', 'github torvalds/linux'];
	public cooldown    : number   = 5000;
	public expectedArgs: number   = 1;

	public async execute({ message, args }: CommandData) {
		const search = args.join(' ');

		let url;
		let res;
		let embed;

		if (search.includes('/')) {
			const parts = search.split('/');
			url = `https://api.github.com/repos/${parts[0]}/${parts[1]}`;
		} else {
			url = `https://api.github.com/search/repositories?q=${search}`;
		}

		try {
			const result = await superagent.get(url).set('User-Agent', 'Dyno Fun (Github)');

			if (result.body && result.body.items && result.body.items.length) {
				res = result.body.items[0];
			} else if (result.body) {
				res = result.body;
			} else {
				return this.error(message.channel, `I didn't find a repository matching that name.`);
			}
		} catch (err) {
			this.logger.error(err);
			return this.error(message.channel, 'An error has occured: Unable to fetch repository');
		}

		try {
			embed = this.buildEmbed({
				author: {
					name: res.owner.login,
					url: res.owner.html_url,
					icon_url: res.owner.avatar_url,
				},
				thumbnail: {
					url: res.owner.avatar_url,
				},
				fields: [
					{
						name: 'Repository',
						value: `[${res.name}](${res.html_url})`,
						inline: true,
					},
				],
				timestamp: res.created_at,
				footer: {
					text: 'Repo created at ',
				},
			}, true);

			if (res.language) {
				embed.fields.push({ name: 'Most Used Language', value: res.language, inline: true });
			}

			if (res.forks_count) {
				embed.fields.push({ name: 'Forks', value: res.forks_count.toString(), inline: true });
			}

			if (res.watchers_count) {
				embed.fields.push({ name: 'Watchers', value: res.watchers_count.toString(), inline: true });
			}

			if (res.open_issues_count) {
				embed.fields.push({ name: 'Open Issues', value: res.open_issues_count.toString(), inline: true });
			}

			if (res.license && res.license.name) {
				embed.fields.push({ name: 'License', value: res.license.name, inline: true });
			}
		} catch (err) {
			this.logger.error(err);
			return this.error(message.channel, `Something went wrong. Please try again.`);
		}

		return this.sendMessage(message.channel, { embed });
	}
}

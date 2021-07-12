import { Command, CommandData } from '@dyno.gg/dyno-core';
import * as superagent from 'superagent';

export default class ITunes extends Command {
	public aliases     : string[] = ['itunes'];
	public module      : string   = 'Fun';
	public description : string   = 'Get info on a song.';
	public usage	   : string   = 'itunes [song name]';
	public example	   : string   = 'itunes Perfect Duet';
	public cooldown    : number   = 5000;
	public expectedArgs: number   = 1;

	public async execute({ message, args }: CommandData) {
		const search = args.join(' ');
		try {
			let res = await superagent.get('https://itunes.apple.com/search').query({ term: search, media: 'music' });
			res = JSON.parse(res.text);

			if (!res || !res.results || !res.results.length) {
				return this.error(message.channel, 'No results found.');
			}

			const result = res.results[0];

			return this.sendMessage(message.channel, {
				embed: {
					author: {
						name: result.trackName,
						icon_url: result.artworkUrl100,
					},
					title: `Song info:`,
					description: `[${result.trackName}](${result.trackViewUrl})`,
					color: 0x3498DB,
					fields: [
						{
							name: 'Artist:',
							value: `[${result.artistName}](${result.artistViewUrl})`,
						},
						{
							name: 'Album:',
							value: `[${result.collectionName}](${result.collectionViewUrl})`,
						},
					],
					thumbnail: {
						url: result.artworkUrl100,
					},
					footer: {
						text: `Genre: ${result.primaryGenreName}`,
					},
					timestamp: (new Date()).toISOString(),
				},
			});
		} catch (err) {
			return this.error(message.channel, 'An error occured: Unable to fetch song.');
		}
	}
}

const { Command } = require('@dyno.gg/dyno-core');
const superagent = require('superagent');

class iTunes extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['itunes'];
		this.module       = 'Fun';
		this.description  = 'Get info on a song.';
		this.usage        = 'itunes [song name]';
		this.example      = 'itunes Perfect Duet';
		this.cooldown     = 7500;
		this.expectedArgs = 1;
	}

	async execute({ message, args }) {
		args = args.join(' ');
		try {
			let res = await superagent.get('https://itunes.apple.com/search').query({ term: args, media: 'music' });
			res = JSON.parse(res.text);

			let artist = res.results[0].artistName;
			let artistLink = res.results[0].artistViewUrl;
			let song = res.results[0].trackName;
			let songLink = res.results[0].trackViewUrl;
			let icon = res.results[0].artworkUrl100;
			let album = res.results[0].collectionName;
			let albumLink = res.results[0].collectionViewUrl;
			let genre = res.results[0].primaryGenreName;

			return this.sendMessage(message.channel, {
				embed: {
					author: {
						name: song,
						icon_url: icon,
					},
					title: `Song info:`,
					description: `[${song}](${songLink})`,
					color: 0x3498db,
					fields: [
						{
							name: 'Artist:',
							value: `[${artist}](${artistLink})`,
						},
						{
							name: 'Album:',
							value: `[${album}](${albumLink})`,
						},
					],
					thumbnail: {
						url: icon,
					},
					footer: {
						text: `Genre: ${genre}`,
					},
					timestamp: new Date(),
				},
			});
		} catch (err) {
			return this.error(message.channel, 'An error occured: Unable to fetch song.');
		}
	}
}

module.exports = iTunes;

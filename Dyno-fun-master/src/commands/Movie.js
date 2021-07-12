const { Command } = require('@dyno.gg/dyno-core');
const movieDB = require('movieDB');

class Movie extends Command {
	constructor(...args) {
		super(...args);

		this.aliases        = ['movie'];
		this.module         = 'Fun';
		this.description    = 'Get info on a movie.';
		this.usage          = 'movie [movie name]';
		this.example        = 'movie Deadpool';
		this.cooldown       = 6000;
		this.expectedArgs   = 1;

		if (this.config.movieDBKey) {
			this._movieDB = movieDB(this.config.movieDBKey);
		}
	}
	searchMovie(query) {
		return new Promise((resolve, reject) => {
			this._movieDB.searchMovie({
				query: query,
				page: 1,
				include_adult: false,
			}, (err, res) => {
				if (err) return reject(err);
				return resolve(res);
			});
		});
	}

	async execute({ msg, args }) {
		if (!this._movieDB) {
			return Promise.reject();
		}

		args = args.join(' ');

		try {
			let res = await this.searchMovie(args);
			res = res.results[0];


			let relDate = (new Date(res.release_date)).toLocaleDateString('en-US', {
				weekday: 'long',
				year: 'numeric',
				month: 'long',
				day: 'numeric',
			});

			return this.sendMessage(msg.channel, {
				embed: {
					author: {
						name: `${res.original_title} ${res.original_language !== 'en' ? `(${res.title})` : ''}`,
						url: `https://www.themoviedb.org/movie/${res.id}`,
						icon_url: 'https://www.themoviedb.org/static_cache/v4/logos/208x226-stacked-green-9484383bd9853615c113f020def5cbe27f6d08a84ff834f41371f223ebad4a3c.png',
					},
					color: 0x337fd5,
					thumbnail: {
						url: res.poster_path ? `https://image.tmdb.org/t/p/w500/${res.poster_path}` : null,
					},
					fields: [
						{
							name: 'Release Date',
							value: relDate,
							inline: true,
						},
						{
							name: 'Rating (out of 10)',
							value: res.vote_average,
							inline: true,
						},
					],
					description: `${res.overview}`,
					footer: {
						text: `Powered by TMDB`,
						icon_url: 'https://www.themoviedb.org/static_cache/v4/logos/208x226-stacked-green-9484383bd9853615c113f020def5cbe27f6d08a84ff834f41371f223ebad4a3c.png',
					},
				},
			});
		} catch (e) {
			return this.error('Uh oh! Something went wrong!');
		}
	}
}

module.exports = Movie;

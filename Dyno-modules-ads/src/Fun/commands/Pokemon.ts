import { Command, CommandData } from '@dyno.gg/dyno-core';
import * as Pokedex from 'pokedex-promise-v2';

function capitalizeFirst(string: string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

function toFeet(n: number) {
	const realFeet = ((n * 0.3937) / 12);
	const feet = Math.floor(realFeet);
	const inches = Math.round((realFeet - feet) * 12);
	return `${feet}ft ${inches}in`;
}

function kToLbs(pK: number) {
	const nearExact = pK / 0.45359237;
	const lbs = Math.floor(nearExact);
	return `${lbs}lbs`;
}

export default class Pokemon extends Command {
	public aliases     : string[] = ['pokemon'];
	public module      : string   = 'Fun';
	public description : string   = 'Get info on pokemon.';
	public usage	   : string   = 'pokemon [name]';
	public example	   : string   = 'pokemon pikachu';
	public cooldown    : number   = 5000;
	public expectedArgs: number   = 1;

	public async execute({ message, args }: CommandData) {
		const P = new Pokedex();

		const color = {
			normal: 0x9B9B6B,
			fire: 0xE5711E,
			water: 0x4C7BED,
			electric: 0xF2C617,
			grass: 0x69B741,
			ice: 0x7FCECE,
			fighting: 0xAF2C25,
			poison: 0x8E398E,
			ground: 0xD9B34A,
			flying: 0x9C88DA,
			psychic: 0xF7356F,
			bug: 0x9BA91E,
			rock: 0xA48F32,
			ghost: 0x634E86,
			dragon: 0x6124F5,
			dark: 0x5E493C,
			style: 0xA6A6C4,
			fairy: 0xE484E4,
		};

		const pokeName = args.join(' ').toLowerCase();

		if (pokeName === 'dyno') {
			const embed = this.buildEmbed({
				author: {
					name: 'Dyno',
					icon_url: 'http://pngimg.com/uploads/pokemon_logo/pokemon_logo_PNG12.png',
				},
				thumbnail: {
					url: 'https://cdn.discordapp.com/attachments/391343682156232714/406339436314624000/dinoa_party.png',
				},
				fields: [
					{ name: 'Height', value: 'Bigger than you.', inline: true },
					{ name: 'Weight', value: 'Fitter than you.', inline: true },
					{ name: 'Type', value: 'Extraordinary', inline: true },
					{ name: `Abilities [Infinity]`, value: 'The All-Powerful Ban Hammer, ∞' },
					{ name: 'Stats',
						value: 'Speed [∞], Special-defense [∞], Special-attack [∞], Defense [∞], Attack [∞], Hp [∞]' },
					{ name: `Moves [Infinity]`, value: 'Better than yours, ∞', inline: true },
				],
				timestamp: (new Date()).toISOString(),
			}, true);

			return this.sendMessage(message.channel, { embed });
		}

		try {
			const res = await P.getPokemonByName(pokeName);

			const height = res.height * 10;
			const weight = res.weight / 10;

			return this.sendMessage(message.channel, {
				embed: {
					author: {
						name: capitalizeFirst(res.species.name),
						icon_url: 'http://pngimg.com/uploads/pokemon_logo/pokemon_logo_PNG12.png',
					},
					color: color[res.types[0].type.name],
					thumbnail: {
						url: res.sprites.front_default,
					},
					fields: [
						{
							name: 'Height',
							value: `${toFeet(height)} (${height}cm)`,
							inline: true,
						},
						{
							name: 'Weight',
							value: `${kToLbs(weight)} (${weight}kg)`,
							inline: true,
						},
						{
							name: res.types.length > 1 ? 'Types' : 'Type',
							value: res.types.map(a => capitalizeFirst(a.type.name)).join(', '),
							inline: true,
						},
						{
							name: `Abilities [${res.abilities.length}]`,
							value: res.abilities.map(a => capitalizeFirst(a.ability.name)).join(', '),
							inline: true,
						},
						{
							name: 'Stats',
							value: res.stats.map(a => `${capitalizeFirst(a.stat.name)} [${a.base_stat}]`).join(', '),
							inline: true,
						},
						{
							name: `Moves [${res.moves.length}]`,
							value: res.moves.map(a => capitalizeFirst(a.move.name)).slice(0, 5).join(', '),
							inline: true,
						},
					],
					timestamp: (new Date()).toISOString(),
				},
			});
		} catch (err) {
			return this.sendMessage(message.channel, 'Oh no, this pokemon is not referenced in the pokedex!');
		}
	}
}

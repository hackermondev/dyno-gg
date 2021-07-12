const { Command } = require('@dyno.gg/dyno-core');
const Pokedex = require('pokedex-promise-v2');

function capitalizeFirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function toFeet(n) {
    let realFeet = ((n * 0.393700) / 12);
    let feet = Math.floor(realFeet);
    let inches = Math.round((realFeet - feet) * 12);
    return `${feet}ft ${inches}in`;
}

function kToLbs(pK) {
    var nearExact = pK / 0.45359237;
    var lbs = Math.floor(nearExact);
    return `${lbs}lbs`;
}

class Pokemon extends Command {
    constructor(...args) {
        super(...args);

        this.aliases = ['pokemon'];
        this.module = 'Fun';
        this.description = 'Get info on a pokemon.';
        this.usage = 'pokemon <pokemon>';
        this.example = 'pokemon pikachu';
        this.cooldown = 5000;
        this.expectedArgs = 1;
    }

    async execute({ message, args }) {
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

        let pokeName = args.join(' ').toLowerCase();

        if (pokeName === 'dyno') {
            const embed = {
                author: {
                    name: 'Dyno',
                    icon_url: 'http://pngimg.com/uploads/pokemon_logo/pokemon_logo_PNG12.png',
                },
                color: 0x337fd5,
                thumbnail: {
                    url: 'https://cdn.discordapp.com/attachments/391343682156232714/406339436314624000/dinoa_party.png',
                },
                timestamp: new Date(),
                fields: [
                    { name: 'Height', value: 'Bigger than you.', inline: true },
                    { name: 'Weight', value: 'Fitter than you.', inline: true },
                    { name: 'Type', value: 'Extraordinary', inline: true },
                    { name: `Abilities [Infinity]`, value: 'The All-Powerful Ban Hammer, ∞' },
                    { name: 'Stats',
                        value: 'Speed [∞], Special-defense [∞], Special-attack [∞], Defense [∞], Attack [∞], Hp [∞]' },
                    { name: `Moves [Infinity]`, value: 'Better than yours, ∞', inline: true },
                ],
            };

            return this.sendMessage(message.channel, { embed });
        }

        try {
            let res = await P.getPokemonByName(pokeName);

            let height = res.height * 10;
            let weight = res.weight / 10;

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
                    timestamp: new Date(),
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
                },
            });
        } catch (err) {
            return this.sendMessage(message.channel, 'Oh no, this pokemon is not referenced in the pokedex!');
        }
    }
}

module.exports = Pokemon;

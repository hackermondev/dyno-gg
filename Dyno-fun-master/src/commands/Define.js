const { Command } = require('@dyno.gg/dyno-core');
const superagent = require('superagent');

class Define extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['define'];
		this.module       = 'Fun';
		this.description  = 'Define a word.';
		this.usage        = 'define [word]';
		this.example      = 'define dyno';
		this.cooldown     = 5000;
		this.expectedArgs = 1;
	}

	async execute({ message, args }) {
		const dynoWords = [
			'dyno',
			'<@155149108183695360>', // dyno
			'<@!155149108183695360>',
			'<@168274283414421504>', // premium
			'<@!168274283414421504>',
			'<@174603896990203905>', // dev
			'<@!174603896990203905>',
		];

		let word = args[0];
		let definition;
		let example;
		let part_of_speech;

		if (dynoWords.find(w => word.toLowerCase().startsWith(w))) {
			definition = this.dyno.globalConfig.definition || `Moderation. Music. Commands. Utilities. Fun. It's the best Discord bot™`;
			example = 'Dude have you checked out Dyno? It\'s literally the best bot.';
			part_of_speech = 'best bot';
			word = 'Dyno';
		} else {
			try {
				let res = await superagent.get('http://api.pearson.com/v2/dictionaries/ldoce5/entries').query({ headword: word });
				res = JSON.parse(res.text);

				definition = res.results[0].senses[0].definition[0];
				if (!res.results[0].senses[0].examples) example = 'No example given.';
				else example = res.results[0].senses[0].examples[0].text;
				part_of_speech = res.results[0].part_of_speech;
			} catch (err) {
				return this.error(message.channel, 'Couldn\'t find any definition for this word!');
			}
		}

		return this.sendMessage(message.channel, { embed: {
			title: `Word: ${word}`,
			description: `**Definition:** ${definition}\n\n**Example:** ${example}`,
			color: 0x3498db,
			footer: {
				text: `Part of speech: ${part_of_speech}`,
			},
			timestamp: new Date(),
		} });
	}
}

module.exports = Define;

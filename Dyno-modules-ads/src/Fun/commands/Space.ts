import { Command, CommandData } from '@dyno.gg/dyno-core';
import * as superagent from 'superagent';

export default class Space extends Command {
	public aliases     : string[] = ['space', 'iss'];
	public module      : string   = 'Fun';
	public description : string   = 'Get info about the space station.';
	public usage	   : string   = 'space';
	public example	   : string   = 'space';
	public cooldown    : number   = 9000;
	public expectedArgs: number   = 0;

	public async execute({ message }: CommandData) {
		try {
			let [iss, issPeople] = await Promise.all([
				superagent.get('http://api.open-notify.org/iss-now.json'),
				superagent.get('http://api.open-notify.org/astros.json'),
			]);

			iss = iss.body;
			issPeople = issPeople.body;

			const location = `${iss.iss_position.latitude}, ${iss.iss_position.longitude}`;
			const humans = issPeople.people.reduce((a: any, b: any) => {
				a[b.craft] = a[b.craft] || [];
				a[b.craft].push(b.name);
				return a;
			}, {});

			const embed = this.buildEmbed({
				author: {
					name: 'ISS Info',
					icon_url: 'https://d30y9cdsu7xlg0.cloudfront.net/png/381875-200.png',
				},
				description: `**Location of the ISS now:** \n${location}\n\n**Humans in Space (${issPeople.number}):**`,
				fields: [

				],
				image: {
					url: 'http://www.businessforum.com/nasa01.JPEG',
				},
				timestamp: (new Date()).toISOString(),
			}, true);

			for (const [craft, ppl] of Object.entries(humans)) {
				for (let i = 0; i < (<any>ppl).length; i++) {
					ppl[i] = `${i + 1}. ${ppl[i]}`;
				}
				embed.fields.push({ name: `**${craft}**`, value: (<any>ppl).join('\n') });
			}

			this.sendMessage(message.channel, { embed });
		} catch (err) {
			return this.error(message.channel, 'Unable to fetch ISS info. Please try again later.');
		}
	}
}

const { Command } = require('@dyno.gg/dyno-core');
const superagent = require('superagent');

class Space extends Command {
    constructor(...args) {
        super(...args);

        this.aliases      = ['space', 'iss'];
        this.module       = 'Fun';
        this.description  = 'Get info about the ISS.';
        this.usage        = 'space';
        this.example      = 'space';
        this.cooldown     = 9000;
        this.expectedArgs = 0;
    }

    async execute({ message }) {
        try {
            let [iss, issPeople] = await Promise.all([
                superagent.get('http://api.open-notify.org/iss-now.json'),
                superagent.get('http://api.open-notify.org/astros.json'),
            ]);

            iss = iss.body;
            issPeople = issPeople.body;

            let location = `${iss.iss_position.latitude}, ${iss.iss_position.longitude}`;
            let humans = issPeople.people.reduce((a, b) => {
                a[b.craft] = a[b.craft] || [];
                a[b.craft].push(b.name);
                return a;
            }, {});

            let embed = {
                author: {
                    name: 'ISS Info',
                    icon_url: 'https://d30y9cdsu7xlg0.cloudfront.net/png/381875-200.png',
                },
                description: `**Location of the ISS now:** \n${location}\n\n**Humans in Space (${issPeople.number}):**`,
                color: 0x3498db,
                fields: [

                ],
                image: {
                    url: 'http://www.businessforum.com/nasa01.JPEG',
                },
                timestamp: new Date(),
            };

            for (let [craft, ppl] of Object.entries(humans)) {
                for (let i = 0; i < ppl.length; i++) {
                    ppl[i] = `${i + 1}. ${ppl[i]}`;
                }
                embed.fields.push({ name: `**${craft}**`, value: ppl.join('\n') });
            }

            this.sendMessage(message.channel, { embed });
        } catch (err) {
            return this.error(message.channel, 'Unable to fetch ISS info. Please try again later.');
        }
    }
}

module.exports = Space;

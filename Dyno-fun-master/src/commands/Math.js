const { Command } = require('@dyno.gg/dyno-core');
const superagent = require('superagent');
const math = require('mathjs');

async function request(i) {
    return await superagent.get(`http://numbersapi.com/${i}?json`);
}


class Math extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['math', 'calc'];
		this.module       = 'Fun';
		this.description  = 'Math command';
		this.usage        = ['math [math expression]', 'math fact'];
		this.example      = ['math 152 + 37', 'math pi', 'math fact', 'math 47', 'math 34 fahrenheit to celsius', 'math 12.7 cm to inch'];
		this.cooldown     = 3000;
		this.expectedArgs = 1;
	}

	async execute({ message, args }) {
		const input = args.join(' ');
        const errmsg = {
            exp: 'Couldn\'t evaluate the given expression',
            err: 'An Error Occured',
            fact: 'Couldn\'t get any facts for that number',
        };
        let res; // Used to get number facts
        let output; // Output from mathjs
        let result = {}; // Sends the result message
            result.embed = {};
            result.embed.fields = [];
            result.embed.color = 0x41dae2;

        if (args[0].toLowerCase() === 'fact') {
            try {
                res = await request('random/math');

                if (res.body.found) {
                    result.embed.fields.push({
                        name: `Fact about ${res.body.number}`,
                        value: res.body.text,
                        inline: false,
                    });
                }
            } catch (e) {
                result = errmsg.err;
            }

            return this.sendMessage(message.channel, result);
        }

        if (args.length === 1 && !isNaN(args[0])) {
                const ainput = (input.startsWith('.')) ? '0' + input : input;
                res = await request(`${ainput.split('.')[0]}/math`);

                if (res.body.found) {
                    result.embed.fields.push({
                        name: `Fact about ${res.body.number}`,
                        value: res.body.text,
                        inline: false,
                    });
                } else {
                    result = errmsg.fact;
                }
        } else {
            try {
                output = math.eval(input).toString();

                result.embed.fields.push({
                    name: 'Input',
                    value: input,
                    inline: false,
                });

                result.embed.fields.push({
                    name: 'Output',
                    value: output,
                    inline: false,
                });
            } catch (e) {
                result = errmsg.exp;
            }
        }

        return this.sendMessage(message.channel, result);
	}
}

module.exports = Math;

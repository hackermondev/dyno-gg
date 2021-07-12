const { Command } = require('@dyno.gg/dyno-core');

class Roll extends Command {
	constructor(...args) {
		super(...args);

		this.aliases 		= ['roll'];
		this.module 		= 'Fun';
		this.description 	= 'Roll the dice (support optional size: d4, d8, d10, d12, d20, d00)';
		this.usage 		= 'roll [size] [number of dice]';
		this.example 		= 'roll 5\nroll d20\nroll d00 4';
		this.cooldown 		= 3000;
		this.expectedArgs 	= 1;
	}

	execute({ message, args }) {
		const dsize = {
			d4: 4,
			d6: 6,
			d8: 8,
			d10: 10,
			d00: 100,
			d12: 12,
			d20: 20,
		};

		let side = 6;
		let dice = 1;
		let results = [];

		if (args.length > 0) {
			if (dsize[args[0].toLowerCase()]) {
				dice = args[1] ? args[1] : 1;

				if (args[0] === 'd00') {
					for (let i = 0; i < dice; i++) {
						results.push((Math.floor(Math.random() * 10) * 10) + Math.floor(Math.random() * 10) + '%');
					}
					results = results.join(', ');
					return this.sendMessage(message.channel, `${message.author.mention} You rolled ${results}`);
				}

				side = dsize[args[0]];
			} else if (!isNaN(args[0])) {
				dice = args[0] ? args[0] : 1;
			} else {
				dice = 1;
			}

			dice = dice > 5 ? 5 : dice;
		}

		for (let i = 0; i < dice; i++) {
			results.push(Math.floor(Math.random() * side) + 1);
		}

		results = results.join(', ');
		return this.sendMessage(message.channel, `${message.author.mention} You rolled ${results}`);
	}
}

module.exports = Roll;

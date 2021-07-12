import { Command, CommandData } from '@dyno.gg/dyno-core';

export default class Roll extends Command {
	public aliases     : string[] = ['roll'];
	public module      : string   = 'Fun';
	public description : string   = 'Roll the dice (support optional size: d4, d8, d10, d12, d20, d00)';
	public usage	   : string[]   = ['roll [number]', 'roll [size] [number of dice]'];
	public example	   : string[]   = ['roll 5', 'roll d20', 'roll d00 4'];
	public cooldown    : number   = 5000;
	public expectedArgs: number   = 1;

	public execute({ message, args }: CommandData) {
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
		let results: any = [];

		if (args.length > 0) {
			if (dsize[args[0].toLowerCase()]) {
				dice = (args[1] && !isNaN(args[1])) ? args[1] : 1;

				if (args[0] === 'd00') {
					dice = dice > 5 ? 5 : dice;

					for (let i = 0; i < dice; i++) {
						// tslint:disable-next-line:prefer-template
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

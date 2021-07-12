'use strict';

const Command = Loader.require('./core/structures/Command');

class RandomColor extends Command {
	constructor(...args) {
		super(...args);

		this.aliases = ['randomcolor', 'randcolor', 'randomcolour'];
		this.group = 'Misc';
		this.description = 'Generates a random hex color with preview.';
		this.usage = 'randomcolor';
		this.cooldown = 3000;
		this.expectedArgs = 0;
	}

	execute({ message }) {
		const hex = ('00000' + (Math.random() * (1 << 24) | 0).toString(16)).slice(-6);
		const int = parseInt(hex, 16);
		const rgb = [(int & 0xff0000) >> 16, (int & 0x00ff00) >> 8, (int & 0x0000ff)];

		return this.sendMessage(message.channel, {
			embed: {
				color: int,
				description: `Hex: #${hex} | RGB: ${rgb.join(',')}`,
			},
		});
	}
}

module.exports = RandomColor;

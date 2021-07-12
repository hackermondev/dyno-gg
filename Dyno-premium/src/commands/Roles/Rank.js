'use strict';

const Command = Loader.require('./core/structures/Command');

class Rank extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['rank', 'team'];
		this.group        = 'Roles';
		this.module       = 'Autoroles';
		this.description  = 'Join/leave a rank.';
		this.usage        = 'rank [rank name]';
		this.cooldown     = 1000;
		this.expectedArgs = 1;
	}

	execute({ message, args }) {
		const Autoroles = this.dyno.modules.get('Autoroles');
		const rank = args.join(' ');

		if (!message.member) {
			return this.error(message.channel, `Couldn't find that user.`);
		}

		return Autoroles.ranks.toggleRank(message, rank)
			.then(res => this.sendMessage(message.channel, res))
			.catch(err => this.error(message.channel, err));
	}
}

module.exports = Rank;

'use strict';

const superagent = require('superagent');
const Command = Loader.require('./core/structures/Command');

class SetAvatar extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['setavatar', 'setav'];
		this.group        = 'Admin';
		this.description  = 'Set the bot avatar';
		this.usage        = 'avatar [url]';
		this.permissions  = 'admin';
		this.extraPermissions = [this.config.owner || this.config.admin];
		this.expectedArgs = 1;
	}

	async execute({ message, args }) {
		try {
			var res = await superagent.get(args[0]);
		} catch (err) {
			return this.error(message.channel, 'Failed to get a valid image.');
		}

		const image = `data:image/jpeg;base64,${res.body.toString('base64')}`;

		return this.client.editSelf({ avatar: image })
			.then(() => this.success(message.channel, 'Changed avatar.'))
			.catch(() => this.error(message.channel, 'Failed setting avatar.'));
	}
}

module.exports = SetAvatar;

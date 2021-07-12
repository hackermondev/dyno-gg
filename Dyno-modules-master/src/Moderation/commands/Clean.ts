import {Command} from '@dyno.gg/dyno-core';
import * as core from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import ModUtils from '../ModUtils';

export default class Clean extends Command {
	public aliases     : string[] = ['clean'];
	public group       : string   = 'Moderator';
	public module      : string   = 'Moderation';
	public description : string   = 'Cleanup the bot responses.';
	public usage       : string   = 'clean (optional number)';
	public example     : string   = 'clean 10';
	public permissions : string   = 'serverMod';
	public expectedArgs: number   = 0;
	public cooldown    : number   = 3000;

	public async execute({ message, args }: core.CommandData) {
		let messages = [];
		const count = args.length ? args[0] : 100;

		try {
			const result = await this.client.getMessages(message.channel.id, 100, message.id);
			messages = result.filter((m: eris.Message) => m.author.id === this.client.user.id);
			if (!messages.length) {
				return Promise.resolve();
			}

			messages = messages.map((m: eris.Message) => m.id);
			if (count && !isNaN(count)) {
				messages = messages.slice(0, parseInt(count, 10));
			}

			await this.client.deleteMessages(message.channel.id, messages);
			message.delete().catch(() => false);
			return Promise.resolve();
		} catch (err) {
			if (messages.length) {
				for (const msg of messages) {
					this.client.deleteMessage(message.channel.id, msg).catch(() => false);
				}
				message.delete().catch(() => false);
			}
			return Promise.resolve();
		}
	}
}

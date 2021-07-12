import {Command} from '@dyno.gg/dyno-core';
import * as core from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import ModUtils from '../ModUtils';

export default class Unban extends Command {
	public aliases            : string[] = ['unban'];
	public group              : string   = 'Moderator';
	public module             : string   = 'Moderation';
	public description        : string   = 'Unban a member';
	public usage              : string   = 'unban [user or id] [optional reason]';
	public permissions        : string   = 'serverMod';
	public cooldown           : number   = 3000;
	public expectedArgs       : number   = 1;
	public requiredPermissions: string[] = ['banMembers'];
	public example            : string[] = [
		'unban NoobLance Appealed',
		'unban NoobLance#0002 Really just a nice guy',
		'unban 155037590859284481 Seriously, he is...',
	];

	public async execute({ message, args, guildConfig }: core.CommandData) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		const modUtils = new ModUtils(this.dyno, guild);

		const argsString = args.join(' ');
		let reason;
		let search;

		if (argsString.includes(',') && !argsString.includes('#')) {
			const argParts = argsString.replace(', ', ',').split(',');

			reason = argParts.length ? argParts.slice(1).join(',') : null;
			search = argParts.shift();
		} else if (argsString.includes('#')) {
			const argParts = argsString.split('#');
			const username = argParts.shift();
			const discrim = argParts[0].split(' ').shift();

			reason = argParts[0].split(' ').slice(1).join(' ');
			search = `${username}#${discrim}`;
		} else {
			search = args.shift();
			reason = args.join(' ');
		}

		try {
			if (search.match(/<@!?/)) {
				search = search.replace(/<@!?([0-9]+)>/, '$1');
			}
		} catch (err) {
			this.logger.error(err);
			return Promise.reject(err);
		}

		try {
			const res = await modUtils.unbanMember(guild, message, search, guildConfig, reason);
			return this.success(message.channel, res);
		} catch (err) {
			return this.error(message.channel, err);
		}
	}
}

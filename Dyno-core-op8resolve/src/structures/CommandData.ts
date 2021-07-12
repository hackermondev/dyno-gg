import * as eris from '@dyno.gg/eris';
import * as dyno from 'Dyno';

export default interface CommandData {
	message: eris.Message;
	args?: any[];
	t?: Function;
	command?: string;
	guildConfig?: dyno.GuildConfig;
	isAdmin?: boolean;
	isOverseer?: boolean;
	suppressOutput?: boolean;
	responseChannel?: eris.TextChannel;
}

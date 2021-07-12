import {Automod} from '@dyno.gg/automod';
import {Autoroles} from '@dyno.gg/autoroles';
import {Moderation} from '@dyno.gg/moderation';
import * as modules from '@dyno.gg/modules';
import {Music} from '@dyno.gg/music';
import AdminHandler from './AdminHandler';
import CommandHandler from './CommandHandler';
import Premium from './Premium';
import ShardStatus from './ShardStatus';

export default {
	hasModules: true,
	modules: {
		AdminHandler,
		Automod,
		Autoroles,
		CommandHandler,
		Moderation,
		Music,
		Premium,
		ShardStatus,
		...modules,
	},
};

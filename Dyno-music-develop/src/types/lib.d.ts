type ErisChannel = eris.GuildChannel | eris.PrivateChannel | eris.GroupChannel | eris.Channel;

interface PlayerData {
	guild: eris.Guild;
	guildConfig: any;
	textChannel: ErisChannel;
	voiceChannel: ErisChannel;
	version: number;
}

interface PlayOptions {
	search?: string;
	channel?: ErisChannel;
}

interface ResolverOptions {
	guild: eris.Guild;
	guildConfig?: {[key: string]: any};
	module: Player;
	version: number;
}

interface TrackInfo {
	identifier : string;
	isSeekable : boolean;
	author     : string;
	length     : number;
	isStream   : boolean;
	position   : number;
	title      : string;
	uri        : string;
}

interface TrackInfoBase {
	track: string;
	info: TrackInfo;
}

interface QueueItem extends TrackInfo {
	track     : string;
	v         : number;
	url?      : string;
	video_id? : string;
}
type QueueItems = null | QueueItem[];

interface QueueConstructor {
	new (dyno: any, guild: eris.Guild): Queue;
}

interface VoiceJoinEvent {
	member: eris.Member;
	channel: ErisChannel;
	guild: eris.Guild;
	guildConfig: any;
}

interface VoiceSwitchEvent {
	member: eris.Member;
	channel: ErisChannel;
	oldChannel: ErisChannel;
	guild: eris.Guild;
	guildConfig: any;
}

type unknown = {} | undefined | null | void;
type UnknownObject = {[key: string]: any};

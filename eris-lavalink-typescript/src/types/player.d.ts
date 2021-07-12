interface PlayerData {
	hostname  : string;
	guildId   : string;
	channelId : string;
	shard     : eris.Shard;
	node      : LavalinkNode;
	manager   : PlayerManager;
	options   : {[key : string] : any};
}

interface PlayerState {
	time     : number;
	position : number;
}

interface ConnectEvent {
	op        : string;
	guildId   : string;
	channelId : string;
	sessionId : string;
	event     : string;
}

interface PlayEvent {
	op         : string;
	guildId    : string;
	track      : string;
	startTime? : number;
	endTime?   : number;
}

interface PlayOptions {
	startTime? : number;
	endTime?   : number;
}

interface StopEvent {
	op      : string;
	guildId : string;
}

interface LavalinkOptions {
	host      : string;
	port?     : number;
	region    : string;
	numShards : number;
	userId    : string;
	password  : string;
	timeout?  : number;
}

interface LavalinkStats {
	op?             : string;
	players?        : number;
	playingPlayers? : number;
	uptime?         : number;
	memory? : {
		used       : number;
		free       : number;
		allocated  : number;
		reservable : number;
	}
	cpu? : {
		cores        : number;
		systemLoad   : number;
		lavalinkLoad : number;
	}
	frameStats? : {
		sent    : number;
		deficit : number;
		nulled  : number;
	}
}

interface LavalinkEvent {
	op: string;
	shardId?: number;
	guildId?: string;
	channelId?: string;
	message?: string;
	state?: PlayerState;
	connected?: boolean;
	valid?: boolean;
	type?: string;
}

interface TrackEvent {
	op: string;
	track: string;
}
interface TrackEndEvent extends TrackEvent {
	reason: string;
}
interface TrackExceptionEvent extends TrackEvent {
	error: string;
}
interface TrackStuckEvent extends TrackEvent {
	thresholdMs: string;
}

type AnyLavalinkEvent = LavalinkEvent | TrackEndEvent | TrackExceptionEvent | TrackStuckEvent;
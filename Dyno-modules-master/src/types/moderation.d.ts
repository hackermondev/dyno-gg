type UserOrMember = eris.User | eris.Member;

interface UserDoc {
	id: string;
	name: string;
	discrim: string;
}

interface ModerationDoc {
	_id?: string;
	server: string;
	channel: string;
	userid: string;
	user: UserDoc;
	mod: string;
	type: string;
	role?: string;
	completedAt?: moment|Date;
}

interface ModerationEvent {
	type: string;
	guild: eris.Guild;
	user: eris.User;
	channel?: eris.Channel;
	mod?: eris.User;
	limit?: number;
	role?: eris.Role;
	reason?: string;
	guildConfig: any;
	colorOverride?: number;
}

interface BannedUser {
	id: string;
	username: string;
	discriminator: string;
	avatarURL: string;
	mention: string;
}

interface ErisBan {
	user?: eris.User;
}
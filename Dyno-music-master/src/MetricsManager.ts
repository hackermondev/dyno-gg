import { Base } from '@dyno.gg/dyno-core';
import * as dyno from 'Dyno';

export default class MetricsManager extends Base {
	private channelMetrics : any;
	private userMetrics : any;
	private endTimeoutMap : any;
	private prom: any;

	public constructor(dynoInstance: dyno.Dyno) {
		super(dynoInstance);
		dynoInstance.internalEvents.on('music', this.handler.bind(this))

		this.channelMetrics = {};
		this.userMetrics = {};
		this.endTimeoutMap = {};
	}

	public handler(e: any) {
		switch (e.type) {
			case 'start':
				this.onStart(e);
				break;
			case 'end':
				this.onEnd(e);
				break;
			case 'disconnect':
				this.onDisconnect(e);
				break;
			case 'changeSong':
				this.onSongEnd(e);
				break;
			case 'playSong':
				this.onPlaySong(e);
				break;
			case 'skip':
				this.onSkip(e);
				break;
			case 'search':
				this.onSearch(e);
				break;
			case 'join':
				this.onUserJoin(e);
				break;
			case 'leave':
				this.onUserLeave(e);
				break;
			default:
				return;
		}
	}

	public onStart({ guild, channel }: any) {
		if (this.endTimeoutMap[channel.id]) {
			clearTimeout(this.endTimeoutMap[channel.id]);
		}
		this.channelMetrics[channel.id] = this.channelMetrics[channel.id] || {};

		const channelMetrics = this.channelMetrics[channel.id];

		if (channelMetrics.isPlaying) {
			return;
		}

		channelMetrics.isPlaying = true;
		channelMetrics.playingSince = new Date();
		delete this.channelMetrics[channel.id].endedAt;

		channel.voiceMembers.forEach((m) => {
			this.onUserJoin({ guild, channel, user: m });
		});
	}

	public onEnd({ guild, channel }: any) {
		const channelMetrics = this.channelMetrics[channel.id];

		if(!channelMetrics || !channelMetrics.playingSince) { return; }

		channelMetrics.isPlaying = false;
		channelMetrics.endedAt = new Date();

		//5 min to consider a session as ended, in case of restarts, etc
		const gracePeriod = 300000;
		this.endTimeoutMap[channel.id] = setTimeout(() => {
			if (!channelMetrics || !channelMetrics.endedAt || !channelMetrics.playingSince) {
				return;
			}

			const timePlaying = channelMetrics.endedAt.getTime() - channelMetrics.playingSince.getTime();

			const userMetrics = this.userMetrics[channel.id];
			let combinedUserListenTime = 0;

			if (!userMetrics) {
				return;
			}

			Object.keys(userMetrics.userJoinMap).forEach((key: any) => {
				const u = userMetrics.userJoinMap[key];

				//Exclude grace period
				let timeListening = -gracePeriod;
				if (u.joinedAt) {
					timeListening += new Date().getTime() - u.joinedAt.getTime();
				}

				if (u.accumulatedTime) {
					timeListening += u.accumulatedTime;
				}

				combinedUserListenTime += timeListening;
				this.prom.register.getSingleMetric('dyno_app_music_user_session_summary').observe(timeListening);
			});

			this.prom.register.getSingleMetric('dyno_app_music_session_summary').observe(timePlaying);
			this.prom.register.getSingleMetric('dyno_app_music_total_playing_time').inc(timePlaying);
			if (combinedUserListenTime > 0) {
				this.prom.register.getSingleMetric('dyno_app_music_total_user_listen_time').inc(combinedUserListenTime);
			}
			this.prom.register.getSingleMetric('dyno_app_music_song_ends').inc(channelMetrics.songEnds);
			this.prom.register.getSingleMetric('dyno_app_music_partial_song_ends').inc(channelMetrics.partialSongEnds);
			this.prom.register.getSingleMetric('dyno_app_music_unique_session_joins').inc(userMetrics.totalJoins);

			delete this.channelMetrics[channel.id];
			delete this.userMetrics[channel.id];
			delete this.endTimeoutMap[channel.id];
		}, gracePeriod);
	}

	public onDisconnect(e: any) {
		this.prom.register.getSingleMetric('dyno_app_music_disconnects').inc();
		this.onEnd(e);
	}

	public onUserJoin({ guild, channel, user }: any) {
		this.userMetrics[channel.id] = this.userMetrics[channel.id] || {};
		const userMetrics = this.userMetrics[channel.id];
		userMetrics.alreadyJoined = userMetrics.alreadyJoined || [];
		if(!userMetrics.alreadyJoined.includes(user.id)) {
			userMetrics.alreadyJoined.push(user.id);
			userMetrics.totalJoins = userMetrics.totalJoins || 0;
			userMetrics.totalJoins += 1;
		}
		userMetrics.userJoinMap = userMetrics.userJoinMap || {};
		userMetrics.userJoinMap[user.id] = userMetrics.userJoinMap[user.id] || {};
		userMetrics.userJoinMap[user.id].joinedAt = new Date();
		this.prom.register.getSingleMetric('dyno_app_music_joins').inc();
	}

	public onUserLeave({ guild, channel, user }: any) {
		const userMetrics = this.userMetrics[channel.id];

		//Discord is wierd and we may have a leave without a join
		if (!userMetrics ||
			!userMetrics.userJoinMap ||
			!userMetrics.userJoinMap[user.id] ||
			!userMetrics.userJoinMap[user.id].joinedAt) { return; }

		const timeListening = new Date().getTime() - userMetrics.userJoinMap[user.id].joinedAt.getTime();
		userMetrics.userJoinMap[user.id].accumulatedTime = userMetrics.userJoinMap[user.id].accumulatedTime || 0;
		userMetrics.userJoinMap[user.id].accumulatedTime += timeListening;
		this.prom.register.getSingleMetric('dyno_app_music_leaves').inc();
	}

	public onSongEnd({ guild, channel }: any) {
		const channelMetrics = this.channelMetrics[channel.id];
		channelMetrics.songEnds = channelMetrics.songEnds || 0;
		channelMetrics.songEnds += 1;
		channelMetrics.songTimings = channelMetrics.songTimings || [];
		channelMetrics.songTimings.push({ date: new Date(), partial: false });
	}

	public onPlaySong({ guild, channel }: any) {
		this.prom.register.getSingleMetric('dyno_app_music_plays').inc();
	}

	public onSearch(e) {
		this.prom.register.getSingleMetric('dyno_app_music_search').inc();
	}

	public onSkip(e: any) {
		const channelMetrics = this.channelMetrics[e.channel.id];

		if (channelMetrics && channelMetrics.isPlaying) {
			channelMetrics.partialSongEnds = channelMetrics.partialSongEnds || 0;
			channelMetrics.partialSongEnds += 1;
			channelMetrics.songTimings = channelMetrics.songTimings || [];
			channelMetrics.songTimings.push({ date: new Date(), partial: true });
		}
		this.prom.register.getSingleMetric('dyno_app_music_skips').inc();
	}
}
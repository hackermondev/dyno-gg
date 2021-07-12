import {Base} from '@dyno.gg/dyno-core';
import axios from 'axios';
import * as dyno from 'Dyno';
import * as querystring from 'querystring';
import Player from './Player';
import { request } from 'http';

/**
 * Track resolver
 * @class Resolver
 */
export default class Resolver extends Base {
	public guildConfig : any;
	public version     : number;
	public player      : Player;

	constructor(dynoInstance: dyno.Dyno, options: ResolverOptions) {
		super(dynoInstance, options.guild);

		this.guildConfig = options.guildConfig;
		this.player      = options.player;
		this.version     = options.version;
	}

	public formatTrackInfo(trackInfo: TrackInfoBase): QueueItem {
		if (trackInfo == undefined || trackInfo.info == undefined) {
			return;
		}

		const formattedTrackInfo = {
			...trackInfo.info,
			track: trackInfo.track,
			v: this.version,
		};

		formattedTrackInfo.length = trackInfo.info.length / 1000;

		return formattedTrackInfo;
	}

	public async resolveTracks(query: string, isSoundcloud?: boolean): Promise<QueueItems> {
		query = query.replace(/<|>/g, '');

		const search = this.parseQuery(query, isSoundcloud);
		const searchId = search.identifier != undefined ? search.identifier : search.search;

		let result;

		const key = `music.query.v${this.version}.${this.utils.sha256(searchId)}`;
		try {
			result = await this.redis.get(key);
			if (result && result.length) {
				result = JSON.parse(result);
				return result.map((track: TrackInfoBase) => this.formatTrackInfo(track));
			}
		} catch (err) {
			this.logError(err, 'player.resolveTracks');
		}

		result = await this.request(search.search);

		if (result == undefined || result.data == undefined || result.data.tracks == undefined) {
			return Promise.reject('Unable to play that video.');
		}

		if (result.data && result.data.tracks) {
			if (result.data.length <= 10) {
				this.redis.setex(key, 604800, JSON.stringify(result.data.tracks));
			}
		}

		return result.data.tracks.map((track: TrackInfoBase) => this.formatTrackInfo(track));
	}

	private parseQuery(query: string, isSoundcloud?: boolean) {
		let search = query;
		let isDirect = false;
		let isSearch = false;
		let identifier;

		if (query.includes('youtu.be')) {
			identifier = query.split('/').pop();
			isDirect = true;
		} else if (query.includes('youtube.com') && query.includes('?')) {
			const parsedQuery = querystring.parse(query.split('?').pop());
			if (parsedQuery && parsedQuery.v) {
				identifier = parsedQuery.v;
			}
			isDirect = true;
		} else if (this.guildConfig.isPremium && query.includes('soundcloud.com')) {
			identifier = query;
			isDirect = true;
		}

		if (this.guildConfig.isPremium && isSoundcloud && !isDirect) {
			search = `scsearch:${search.toLowerCase()}`;
			isSearch = true;
		} else if (!isDirect && !query.includes('youtube.com') && !query.includes('youtu.be')) {
			search = `ytsearch:${search.toLowerCase()}`;
			isSearch = true;
		}

		return { search, identifier };
	}

	private async request(search: string) {
		const node = this.player.node;

		if (!node || !node.host) {
			this.logger.error(`Node or host undefined for`, {
				host: this.player.nodeHost || 'unknown host',
				guild: this.player.guild.id,
				shard: this.player.guild.shard.id,
				cluster: this.cluster.clusterId,
			});
			return Promise.reject(`Unable to reach the voice server. This has been reported to the developers.`);
		}

		try {
			return await axios.get(`http://${node.host}:${node.port}/loadtracks?identifier=${search}`, {
				headers: { Authorization: node.password, Accept: 'application/json' },
			});
		} catch (err) {
			return Promise.resolve(`I wasn't able to get a result, please try another.`);
		}
	}
}

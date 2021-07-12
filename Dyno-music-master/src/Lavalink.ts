import {Base} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as dyno from 'Dyno';
import { LavalinkNode, Player, PlayerManager } from 'eris-lavalink';

/**
 * Lavalink manager
 */
export default class Lavalink extends Base {
	constructor(dynoInstance: dyno.Dyno) {
		super(dynoInstance);

		let nodes = this.globalConfig.lavalinkNodes || [];

		if (this.config.isPremium) {
			nodes = nodes.filter((n: dyno.NodeConfig) => n.premium);
		} else {
			nodes = nodes.filter((n: dyno.NodeConfig) => !n.premium);
		}

		const regions = {
			eu: ['eu', 'amsterdam', 'frankfurt', 'russia', 'hongkong', 'singapore', 'sydney'],
			us: ['us', 'brazil'],
		};

		if (!(this.client.voiceConnections instanceof PlayerManager)) {
			this.client.voiceConnections = <PlayerManager> new PlayerManager(this.client, nodes, {
				numShards: this.dyno.options.shardCount,
				userId: this.config.client.userid || '155149108183695360',
				regions: regions,
				defaultRegion: 'eu',
			});
		}
	}

	public checkNodes() {
		if (!this.dyno.isReady) {
			return;
		}

		const voiceConnections = <PlayerManager>this.client.voiceConnections;

		let nodes = this.globalConfig.lavalinkNodes;
		const voiceNodes = voiceConnections.nodes;

		if (this.config.isPremium) {
			nodes = nodes.filter((n: dyno.NodeConfig) => n.premium);
		} else {
			nodes = nodes.filter((n: dyno.NodeConfig) => !n.premium);
		}

		if (nodes && nodes.length) {
			for (const node of nodes) {
				if (voiceNodes.has(node.host)) {
					continue;
				}
				voiceConnections.createNode(Object.assign({}, node, {
					numShards: this.dyno.options.shardCount,
					userId: this.config.client.userid || '155149108183695360',
				}));
			}
		}

		if (voiceNodes && voiceNodes.size) {
			for (const [host, node] of voiceNodes) {
				if (nodes.find((n: LavalinkNode) => n.host === host)) {
					continue;
				}
				voiceConnections.removeNode(host);
			}
		}
	}

	public updateStats() {
		const voiceConnections = <PlayerManager>this.client.voiceConnections;
		const playingConnections = [...voiceConnections.values()].filter((p: Player) => p.playing);
		this.redis.hset(`dyno:vc:${this.config.client.id}`,
			`${this.dyno.options.clusterId}:${this.config.state}`, playingConnections.length || 0).catch(() => null);

		for (const [host, node] of voiceConnections.nodes) {
			if (!node.stats) {
				continue;
			}
			this.redis.hset(`lavalink:nodes`, host, JSON.stringify(node.stats));
		}
	}
}

import React from 'react';
import ReactTooltip from 'react-tooltip';

export default class Cluster extends React.Component {
	number_format = (number) => number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	render() {
		let cluster = this.props.cluster;
		let shards;
		let color = 'success';
		let problems = [];
		let extrainfo;

		if (cluster.error) {
			if (cluster.error === 'Redis call failed.') {
				color = 'ipc-timeout';
				problems.push(`${cluster.error} Please wait a few minutes and try again.`);
			} else {
				color = 'error';
				problems.push(`${cluster.error} Please try again later.`);
			}

			if (cluster.guessedShards) {
				shards = `${cluster.guessedShards[0]} - ${cluster.guessedShards[5]}`;
			} else {
				shards = `Error`;
			}
		} else {
			let first = cluster.result.shards[0], last = cluster.result.shards[cluster.result.shards.length - 1];
			shards = first === last ? first : `${first} - ${last}`;
			if (cluster.result.unavailableCount > 0) {
				if (cluster.result.unavailableCount > 10) {
					color = 'warning';
				}
				problems.push(this.number_format(cluster.result.unavailableCount) + ' guild(s) unavailable');
			}
			if (cluster.result.connectedCount < cluster.shardCount - 1) {
				if (cluster.result.connectedCount <= (cluster.shardCount / 2)) {
					color = 'error';
				} else {
					color = 'warning';
				}
				problems.push(this.number_format((cluster.shardCount - cluster.result.connectedCount)) + ' shard(s) unavailable');
			}

			extrainfo = (<div>
				<p>Uptime: {cluster.result.uptime}</p>
				<p>{this.number_format(cluster.result.guildCount)} guilds</p>
				<p>{this.number_format(cluster.result.voiceConnections)} voice connections</p>
			</div>);
		}
		if (problems.length) {
			problems = problems.join(', ');
		} else {
			problems = 'No issues';
		}
		let highlight = this.props.highlight ? ' shadow-highlight' : '';
		return (
		<div>
			<div onClick={(ev) => { ReactTooltip.show(ev.target); }} data-tip data-for={`clusterStatus${cluster.env}${cluster.id}`} className={`cluster bg-${color}${highlight}`}>
				{cluster.id}
			</div>
			<ReactTooltip id={`clusterStatus${cluster.env}${cluster.id}`} type={color === 'ipc-timeout' ? 'dark' : color} effect='solid'>
				<h5 className={'title is-5'}>Cluster {cluster.id}</h5>
				{cluster.result && cluster.result.server && (<p>Server: {cluster.result.server}</p>)}
				<p>Shards: {shards}</p>
				<p><strong>{problems}</strong></p>
				{extrainfo}
			</ReactTooltip>
		</div>);
	}
}

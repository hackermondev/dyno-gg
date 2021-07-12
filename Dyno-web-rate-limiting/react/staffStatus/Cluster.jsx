import axios from 'axios';
import React from 'react';
import ReactTooltip from 'react-tooltip';
import { Menu, Item, MenuProvider, Submenu } from 'react-contexify';
import '!style-loader!css-loader!react-contexify/dist/ReactContexify.min.css';

export default class Cluster extends React.Component {
	number_format = (number) => number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

	async handleRestart(env) {
		const id = this.props.cluster.id;
		if (!env || !id) { return; }

		try {
			await axios.post(`/api/status/restart`, {
				env,
				id,
			});
			window.alert(`Restarting ${this.props.server} cluster ${id}.`);
		} catch (err) {
			console.error(err);
			window.alert('Something went wrong. See the console for more information.');
		}
	}

	async handleConnect(env, id) {
		if (!env || !id) { return; }
		try {
			await axios.post(`/api/status/connect/${id}`, {
				clusterId: this.props.cluster.id,
				shardId: id,
				env,
			});
			window.alert(`Reconnecting shard ${id}.`);
		} catch (err) {
			console.error(err);
			window.alert('Something went wrong. See the console for more information.');
		}
	}

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

		let dcShards;
		if (cluster.result) {
			dcShards = cluster.result.shardStatus.filter(s => s.status === 'disconnected');
		}

		const StaffMenu = (
			<Menu id={`staff-menu-${cluster.env}${cluster.id}`} theme='dark' animation='zoom'>
				<Item onClick={this.handleRestart.bind(this, cluster.env)}>Restart {cluster.id}</Item>
				{cluster.result && (cluster.result.connectedCount < cluster.shardCount) && (<Separator />) &&
					dcShards.map(s => (
						<Item key={s.id} onClick={this.handleConnect.bind(this, cluster.env, s.id)}>Connect Shard {s.id}</Item>
					))}
			</Menu>
		);

		return (
		<div>
			<MenuProvider id={`staff-menu-${cluster.env}${cluster.id}`} event='onContextMenu'>
				<div onClick={(ev) => { ReactTooltip.show(ev.target); }} data-tip data-for={`clusterStatus${cluster.env}${cluster.id}`} className={`cluster bg-${color}${highlight}`}>
					{cluster.id}
				</div>
			</MenuProvider>
			<ReactTooltip id={`clusterStatus${cluster.env}${cluster.id}`} type={color === 'ipc-timeout' ? 'dark' : color} effect='solid'>
				<h5 className={'title is-5'}>Cluster {cluster.id}</h5>
				{cluster.result && cluster.result.server && (<p>Server: {cluster.result.server}</p>)}
				<p>Shards: {shards}</p>
				<p><strong>{problems}</strong></p>
				{extrainfo}
			</ReactTooltip>
			{StaffMenu}
		</div>);
	}
}

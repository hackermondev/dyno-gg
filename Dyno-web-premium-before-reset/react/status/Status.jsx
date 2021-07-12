import React from 'react';
import Server from './Server.jsx';
import axios from 'axios';
import { Circle } from 'rc-progress';
export default class Status extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			fetching: true,
			statuses: {},
			error: '',
			serverId: '',
			foundInfo: { shard: '', cluster: '', },
			foundInfoError: '',
			percentage: 0,
			onlineOffline: '',
			refs: {},
		};
	}

	async componentDidMount() {
		const script = document.createElement('script');
		script.src = '//cdn.carbonads.com/carbon.js?zoneid=1673&serve=C6AILKT&placement=dynobotnet';
		script.id = '_carbonads_js';
		script.async = true;
		document.getElementById('carbon-wrapper').appendChild(script);

		this.getStatus();
	}

	setRef = (server, ref) => {
		if (!ref) {
			return;
		}
		const refs = this.state.refs;

		if (refs[server] && refs[server] === ref) {
			return;
		}

		console.log(server, ref);

		refs[server] = ref;
		this.setState({ refs });
	}

	getStatus = async () => {
		try {
			this.setState({ fetching: true });
			let statusRequest = await axios.get('/api/status');
			const totalShards = 864;

			let connectedShards = 0;
			for (let server in statusRequest.data) {
				statusRequest.data[server].forEach(function(cluster) {
					let connectedCount = 0;
					if (cluster.result) connectedCount += cluster.result.connectedCount;
					connectedShards += connectedCount || 0;
				});
			}
			let percentage = (connectedShards / totalShards) * 100;
			percentage = percentage.toFixed(0);
			this.setState({
				statuses: statusRequest.data,
				fetching: false,
				percentage,
				onlineOffline: `${connectedShards} / ${totalShards}`
			});
			this.findInfo();
		} catch (e) {
			this.setState({ error: 'Failed to load status, trying again in 30 seconds.', fetching: false });
		}
		setTimeout(this.getStatus, 30 * 1000);
	}

	onServerIDChange = (sid) => {
		this.setState({ foundInfo: { shard: '', cluster: '' }, foundInfoError: '' });
		this.setState({ serverId: sid.target.value });
		let serverId = sid.target.value.match(/(\d{15,})/);
		const totalShards = 864;
		if (serverId === null || serverId[1] === undefined) {
			return;
		}
		let shard = ~~((serverId[1] * 1 / 4194304) % totalShards);
		let cluster = 0;
		let foundServer;
		Object.keys(this.state.statuses).forEach(server => {
			if (cluster !== 0) { return; }
			let search = this.state.statuses[server].find(i => (i.result && i.result.shards.includes(shard)) || (i.guessedShards && i.guessedShards.includes(shard)));
			if (search !== undefined) {
				foundServer = server;
				cluster = server[0] + search.id;
				return;
			}
		});
		if (cluster === 0) {
			cluster = 'unknown';
		}
		if (foundServer) {
			const ref = this.state.refs[foundServer];
			ref.scrollIntoView({
				behavior: 'smooth',
				block: 'start',
			});
		}
		this.setState({ foundInfo: { shard, cluster }, foundInfoError: '' })
	}

	findInfo = () => {
		this.setState({ foundInfo: { shard: '', cluster: '' }, foundInfoError: '' });
		if (this.state.serverId === '') return;
		let serverId = this.state.serverId.match(/(\d{15,})/);
		const totalShards = 864;
		if (serverId === null || serverId[1] === undefined) {
			this.setState({ foundInfo: { shard: '', cluster: '' }, foundInfoError: 'Invalid Server ID' });
			return;
		}
		let shard = ~~((serverId[1] * 1 / 4194304) % totalShards);
		let cluster = 0;
		Object.keys(this.state.statuses).forEach(server => {
			if (cluster !== 0) { return; }
			let search = this.state.statuses[server].find(i => (i.result && i.result.shards.includes(shard)) || (i.guessedShards && i.guessedShards.includes(shard)));
			if (search !== undefined) {
				cluster = server[0] + search.id;
				return;
			}
		});
		if (cluster === 0) {
			cluster = 'unknown';
		}
		this.setState({ foundInfo: { shard, cluster }, foundInfoError: '' })
	}

	render() {
		let servers;
		let foundInfo;
		let hasLoaded = !!Object.keys(this.state.statuses).length;
		let percent = this.state.percentage;
		let shards = this.state.onlineOffline;
		if (this.state.foundInfoError !== '') {
			foundInfo = (<p>{this.state.foundInfoError}</p>);
		}
		// if (this.state.foundInfo.shard !== '') {
		// 	foundInfo = (<p>This server is on shard #{this.state.foundInfo.shard} which is on cluster {this.state.foundInfo.cluster}. <strong>The cluster has been highlighted blue, hover over it to see if there's any problems with it.</strong></p>);
		// }
		if (this.state.error === '') {
			servers = Object.keys(this.state.statuses).map(server => <Server key={server} server={server} foundInfo={this.state.foundInfo} clusters={this.state.statuses[server]} setRef={this.setRef} />);
		}
		let fetching = (<p>This page auto-updates every 30 seconds.</p>);
		if (this.state.fetching) {
			fetching = (<p>Getting status information, please wait...</p>);
		}

		// console.log(this.state.refs);

		return (<div>
			<div className="status-wrapper">
				<div className="columns is-multiline status-header">
					<div className="column is-half is-full-touch">
						<h1 className="title">Status</h1>
						<div className="container">{fetching}</div>
					</div>
					<div className="column is-half is-full-touch carbon-container">
                            <div className="carbon-wrapper" id='carbon-wrapper'>
                            </div>
                        </div>
				</div>
				<div className='container'><p>{this.state.error}</p></div>
				<h1 className="has-text-weight-semibold is-size-2 legend-title">Availability per service</h1>
				<div className='legend-wrapper'>
					<div className='legend bg-success'><span className="legend-marker"></span>Operational</div>
					<div className='legend bg-warning'><span className="legend-marker"></span>Partial Outage</div>
					<div className='legend bg-error'><span className="legend-marker"></span>Major Outage</div>
				</div>
				<div className="columns server-finder">
					<div className="find-server column is-half is-full-mobile">
						<p className="control has-addons">
							<input className="input" type="text" onChange={this.onServerIDChange} placeholder="Look up your server (by ID)" />
						</p>
					</div>
					<div className="shard-count column is-half is-full-mobile">
						<h1 className="is-size-3 has-text-primary">{shards} shards</h1>
					</div>
					{foundInfo}
				</div>
				<div className="servers">
					{servers}
				</div>
			</div></div>);
	}
}

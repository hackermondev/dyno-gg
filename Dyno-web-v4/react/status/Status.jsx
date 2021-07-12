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
            onlineOffline: ''
        };
    }

    async componentDidMount() {
        this.getStatus();
    }

    getStatus = async () => {
      try {
        this.setState({ fetching: true });
        let statusRequest = await axios.get('/api/status');
        const totalShards = 576;
        
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

    onServerIDChange = (serverId) => {
      this.setState({ serverId: serverId.target.value });
    }

    findInfo = () => {
      this.setState({ foundInfo: { shard: '', cluster: '' }, foundInfoError: ''})
      if (this.state.serverId === '') return;
      let serverId = this.state.serverId.match(/(\d{15,})/);
      if (serverId === null || serverId[1] === undefined) {
        this.setState({ foundInfo: { shard: '', cluster: '' }, foundInfoError: 'Invalid Server ID'});
        return;
      }
      let shard = ~~((serverId[1]*1 / 4194304) % totalShards);
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
      this.setState({ foundInfo: { shard, cluster }, foundInfoError: ''})
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
        if (this.state.foundInfo.shard !== '') {
          foundInfo = (<p>This server is on shard #{this.state.foundInfo.shard} which is on cluster {this.state.foundInfo.cluster}. <strong>The cluster has been highlighted blue, hover over it to see if there's any problems with it.</strong></p>);
        }
        if (this.state.error === '') {
            servers = Object.keys(this.state.statuses).map(server => <Server key={server} server={server} foundInfo={this.state.foundInfo} clusters={this.state.statuses[server]}/>);
        }
        let fetching = (<p>This page auto-updates every 30 seconds.</p>);
        if (this.state.fetching) {
            fetching = (<p>Getting status information, please wait...</p>);
        }
        return (<div>
          <div className="status-wrapper">
            <div className="container">{fetching}</div>
            {hasLoaded ? (<div className="server-finder container">
              <label className="label">Enter your Server ID to find your shard and cluster information.</label>
              <div className="text-form">
                <p className="control has-addons">
                  <input className="input" type="text" onChange={this.onServerIDChange} />
                  <a className="button is-info" onClick={this.findInfo}>Find info</a>
                </p>
              </div>
              {foundInfo}
            </div>) : ''}
            <div className='container'><p>{this.state.error}</p></div>
            <div className='legend container'>
              <div className='cluster-grid'>
                <p>Legend:</p>
                <div className='cluster bg-success'>Operational</div>
                <div className='cluster bg-warning'>Partial Outage</div>
                <div className='cluster bg-error'>Major Outage</div>
                <div className='cluster bg-ipc-timeout'>IPC Timeout</div>
              </div>
              <p><strong>Hover over a cluster for more information.</strong></p>
            </div>
            <div className='container percentage'>
              <Circle className='percent-circle'  percent={percent} trailWidth="10" trailColor="#ed6c63" strokeWidth="10" strokeColor="#009b54"/>
              <ul className='up-info'>
                <li>{percent}% online</li>
                <li>{shards} shards connected</li>
              </ul>
            </div>
            <div className="servers">
              {servers}
            </div>
          </div></div>);
    }
}

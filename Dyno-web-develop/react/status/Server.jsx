import React from 'react';
import Cluster from './Cluster.jsx';

export default class Server extends React.Component {
  render() {
    let env = this.props.env;
    if (!env) {
      return (<div><p>Error</p></div>);
    }

    let clusters = env.statuses;
    let clustersWithProblems = clusters.filter(i =>
      i.error !== undefined || i.result.connectedCount < i.result.shardCount || i.result.unavailableCount > 10);

    let gridClusters = clusters.map(cluster => (
      <Cluster
        key={cluster.id}
        // highlight={this.props.foundInfo.cluster[0] === this.props.server[0] && (this.props.server[0] + cluster.id) === this.props.foundInfo.cluster}
        server={env.displayName}
        cluster={cluster} />
    ));

    return (<div className="server-wrapper">
      <h4 className={`title is-3`}>Service: {env.displayName}</h4>
      <div className="shard-count">
        <h1 className="is-size-4 has-text-primary">{env.onlineOffline} shards</h1>
      </div>
      <p className={`has-text-grey`}>{clustersWithProblems.length} / {clusters.length} clusters have problems.</p>
      <div className="cluster-grid">
        {gridClusters}
      </div>
    </div>);
  }
}

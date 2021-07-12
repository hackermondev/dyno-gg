import React from 'react';
import Cluster from './Cluster.jsx';

export default class Server extends React.Component {
  render() {
    let server = this.props.server;
    if (!server) {
      return (<div><p>Error</p></div>);
    }
    let clusters = this.props.clusters;
    let clustersWithProblems = this.props.clusters.filter(i => i.error !== undefined || i.result.connectedCount < 6 || i.result.unavailableCount > 10);
    let statusColor = 'success';
    if (clustersWithProblems.length >= 5) {
      statusColor = 'danger';
    } else if (clustersWithProblems.length > 0) {
      statusColor = 'warning';
    }
    let gridClusters = clusters.map(cluster => <Cluster key={cluster.id} highlight={this.props.foundInfo.cluster[0] === this.props.server[0] && (this.props.server[0] + cluster.id) === this.props.foundInfo.cluster} server={server} data={cluster}/>);
    return (<div>
      <h4 className={`title is-4`}>Server: {server}</h4>
      <p className={`status-${statusColor}`}>{clustersWithProblems.length} / {clusters.length} clusters have problems.</p>
      <div className="cluster-grid">
        {gridClusters}
      </div>
    </div>);
  }
}

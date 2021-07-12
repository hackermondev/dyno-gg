/* eslint-disable no-invalid-this */
/* global window */
import React from 'react';
import ActivatedServers from './ActivatedServers.jsx';
import Subscription from './Subscription.jsx';


export default class Premium extends React.Component {
	render() {
		return (
			<div>
				<h1 className="is-size-2 has-text-weight-semibold">Premium</h1>
				<p className="has-text-grey is-size-5">Your premium plans and activated servers</p>
				<Subscription {...this.props} />
				<ActivatedServers {...this.props} />
			</div>
		);
	}
}

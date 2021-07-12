/* eslint-disable no-invalid-this */
import React from 'react';
import axios from 'axios';

/* eslint-disable no-unused-vars */
import Premium from './Tabs/Premium.jsx';
import Listing from './Tabs/Listing.jsx';
import Manage from './Tabs/Manage.jsx';
import Patreon from './Tabs/Patreon.jsx';
import Loader from '../dashboard/common/Loader.jsx';

import {
	Route,
	NavLink,
	Switch,
} from 'react-router-dom';
/* eslint-enable no-unused-vars */

export default class Account extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			userData: null,
			error: '',
			guilds: null,
			subscriptionGuilds: [],
			patreonGuilds: [],
			manageableGuilds: [],
		};
	}

	async getData() {
		try {
			let urlSuffix = '';
			const regexMatch = window.location.href.match(/.*account\/premium\/([0-9]+)/);
			if (regexMatch) {
				const userId = regexMatch[1];
				urlSuffix = `/${userId}`;
			}

			let userDataRequest = await axios.get(`/account/data${urlSuffix}`);
			let { premiumUser, guilds, subscriptionGuilds, patreonGuilds, manageableGuildsIds } = userDataRequest.data;

			this.setState({
				userData: premiumUser,
				guilds: guilds,
				subscriptionGuilds: subscriptionGuilds || [],
				patreonGuilds: patreonGuilds || [],
				manageableGuilds: guilds.filter((g) => manageableGuildsIds.includes(g.id)),
				isImpersonating: urlSuffix !== '',
			});
		} catch (e) {
			this.setState({ error: 'Failed to load servers, try again later' });
		}
	}

	async componentDidMount() {
		await this.getData();
	}

	cancelSubscription = async (id) => {
		// if (this.state.isImpersonating) return;
		try {
			if (this.state.isImpersonating) {
				await axios.post(`/account/subscriptions/${id}/cancel`, {
					premiumUser: this.state.userData,
				});
			} else {
				await axios.post(`/account/subscriptions/${id}/cancel`);
			}
			this.getData();
		} catch (e) {
			this.setState({ error: 'Failed to cancel subscription, try again later' });
		}
	}

	render() {
		const path = this.props.match.path;

		if (!this.state.userData) {
			return <Loader />;
		}

		return (
			<div className='container'>
				<Premium {...this.state} getData={this.getData.bind(this)} cancelSubscription={this.cancelSubscription.bind(this)} />
				<Manage guilds={this.state.manageableGuilds} />
				{/* <div className='accounts-tabs'>
					<NavLink className='manage-tab' activeClassName='is-active' exact to={`${path}`}>Manage</NavLink>
					<NavLink className='premium-tab' activeClassName='is-active' to={`${path}/premium`}>Premium</NavLink>
				</div>
				<Switch>
					<Route exact path={path} render={() =>
						<Manage guilds={this.state.manageableGuilds} />
					} />
					<Route path={`${path}/premium`} render={() =>
						<Premium {...this.state} getData={this.getData.bind(this)} cancelSubscription={this.cancelSubscription.bind(this)} />
					} />
					<Route path={`${path}/listing`} render={() =>
						<Listing {...this.state} getData={this.getData.bind(this)} cancelSubscription={this.cancelSubscription.bind(this)} />
					} />
					<Route path={`${path}/patreon`} render={() =>
						<Patreon {...this.state} history={this.props.history} getData={this.getData.bind(this)} cancelSubscription={this.cancelSubscription.bind(this)} />
					} />
				</Switch> */}
			</div>
		);
	}
}

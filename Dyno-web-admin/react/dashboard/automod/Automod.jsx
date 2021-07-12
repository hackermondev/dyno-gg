import React from 'react';
import axios from 'axios';
import { NavLink, Route } from 'react-router-dom';
import BannedWords from './BannedWords.jsx';
import LinkBlacklist from './LinkBlacklist.jsx';
import LinkWhitelist from './LinkWhitelist.jsx';
import ModuleSettings from '../common/ModuleSettings.jsx';
import Settings from './Settings.jsx';

export default class Automod extends React.Component {
	state = {
		automod: {},
		channels: [],
		roles: [],
		isLoading: true,
	}

	async componentWillMount() {
		try {
			let response = await axios.get(`/api/modules/${this.props.match.params.id}/automod`);
			this.setState({
				automod: response.data.automod,
				channels: response.data.channels,
				roles: response.data.roles,
				isLoading: false,
			});
		} catch (e) {
			this.setState({ error: 'Failed to get data, try again later' });
		}
	}

    render() {
		const path = this.props.match.path;
		const url = this.props.match.url.replace(/\/$/, '');

		return (<ModuleSettings {...this.props} name='automod' title='Automod' isLoading={this.state.isLoading}>
			<div className='has-tabs'>
				<div className='tabs'>
					<ul className='tabs'>
						<li><NavLink exact to={`${url}`} className='subtab-control' activeClassName='is-active'>Settings</NavLink></li>
						<li><NavLink to={`${url}/bannedwords`} className='subtab-control' activeClassName='is-active'>Banned Words</NavLink></li>
						<li><NavLink to={`${url}/blacklist`} className='subtab-control' activeClassName='is-active'>Link Blacklist</NavLink></li>
						<li><NavLink to={`${url}/whitelist`} className='subtab-control' activeClassName='is-active'>Link Whitelist</NavLink></li>
					</ul>
				</div>
			</div>
			<Route exact path={`${path}`} render={(props) => (
				<Settings {...this.props} automod={this.state.automod} channels={this.state.channels} roles={this.state.roles} />
			)} />
			<Route path={`${path}/bannedwords`} render={(props) => (
				<BannedWords {...this.props} automod={this.state.automod} />
			)} />
			<Route path={`${path}/blacklist`} render={(props) => (
				<LinkBlacklist {...this.props} automod={this.state.automod} />
			)} />
			<Route path={`${path}/whitelist`} render={(props) => (
				<LinkWhitelist {...this.props} automod={this.state.automod} />
			)} />
		</ModuleSettings>);
    }
}

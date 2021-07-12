import React from 'react';
import { NavLink, Route } from 'react-router-dom';
import AutomodLogs from './AutomodLogs.jsx';
import CommandLogs from './CommandLogs.jsx';
import DashboardLogs from './DashboardLogs.jsx';
import ModLogs from './ModLogs.jsx';

export default class Logs extends React.Component {
	render() {
		const path = this.props.match.path;
		const url = this.props.match.url.replace(/\/$/, '');

		return (<div className='module-content'>
			<div className='has-tabs'>
				<div className='tabs'>
					<ul className='tabs'>
						<li><NavLink exact to={`${url}`} className='subtab-control' activeClassName='is-active'>Dashboard</NavLink></li>
						<li><NavLink to={`${url}/moderation`} className='subtab-control' activeClassName='is-active'>Moderation</NavLink></li>
						<li><NavLink to={`${url}/automod`} className='subtab-control' activeClassName='is-active'>Automod</NavLink></li>
						<li><NavLink to={`${url}/command`} className='subtab-control' activeClassName='is-active'>Commands</NavLink></li>
					</ul>
				</div>
			</div>
			<Route exact path={`${path}`} render={(props) => (
				<DashboardLogs {...this.props} />
			)} />
			<Route path={`${path}/moderation`} render={(props) => (
				<ModLogs {...this.props} />
			)} />
			<Route path={`${path}/automod`} render={(props) => (
				<AutomodLogs {...this.props} />
			)} />
			<Route path={`${path}/command`} render={(props) => (
				<CommandLogs {...this.props} />
			)} />
		</div>);
	}
}

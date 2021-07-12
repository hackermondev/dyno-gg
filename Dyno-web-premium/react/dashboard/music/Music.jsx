import React from 'react';
import { NavLink, Route } from 'react-router-dom';
import ModuleSettings from '../common/ModuleSettings.jsx';
import Queue from './Queue.jsx';
import Settings from './Settings.jsx';

export default class Music extends React.Component {
    render() {
		const path = this.props.match.path;
		const url = this.props.match.url.replace(/\/$/, '');

		return (<ModuleSettings {...this.props} name='music' title='Music' isLoading={false}>
			<div className='has-tabs'>
				<div className='tabs'>
					<ul className='tabs'>
						<li><NavLink exact to={`${url}`} className='subtab-control' activeClassName='is-active'>Settings</NavLink></li>
						<li><NavLink to={`${url}/queue`} className='subtab-control' activeClassName='is-active'>Queue</NavLink></li>
					</ul>
				</div>
			</div>
			<Route exact path={`${path}`} render={(props) => (
				<Settings {...this.props} />
			)} />
			<Route path={`${path}/queue`} render={(props) => (
				<Queue {...this.props} />
			)} />
		</ModuleSettings>);
	}
}

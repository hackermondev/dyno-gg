import React from 'react';
import { NavLink, Route } from 'react-router-dom';
import ModuleSettings from '../common/ModuleSettings.jsx';
import Queue from './Queue.jsx';
import Settings from './Settings.jsx';

export default class Music extends ModuleSettings {
    render() {
		const path = this.props.match.path;
		const url = this.props.match.url.replace(/\/$/, '');

		return (<div id='module-music' className='module-content module-settings'>
			<h3 className='title is-4'>Music {this.ModuleToggle}</h3>
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
		</div>);
	}
}

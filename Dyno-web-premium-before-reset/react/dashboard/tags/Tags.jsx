import React from 'react';
import ModuleSettings from '../common/ModuleSettings.jsx';
import { NavLink, Route } from 'react-router-dom';
import Settings from './Settings.jsx';
import TagList from './TagList.jsx';

export default class Tags extends ModuleSettings {
	render() {
		const path = this.props.match.path;
		const url = this.props.match.url.replace(/\/$/, '');

		return (<div id='module-tags' className='module-content module-settings'>
			<h3 className='title is-4'>Tags {this.ModuleToggle}</h3>
			<div className='has-tabs'>
				<div className='tabs'>
					<ul className='tabs'>
						<li><NavLink exact to={`${url}`} className='subtab-control' activeClassName='is-active'>Settings</NavLink></li>
						<li><NavLink to={`${url}/list`} className='subtab-control' activeClassName='is-active'>Tag List</NavLink></li>
					</ul>
				</div>
			</div>
			<Route exact path={`${path}`} render={(props) => (
				<Settings {...this.props} />
			)} />
			<Route path={`${path}/list`} render={(props) => (
				<TagList {...this.props} />
			)} />
		</div>);
	}
}

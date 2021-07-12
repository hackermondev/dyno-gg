import React from 'react';
import ModuleSettings from '../common/ModuleSettings.jsx';
import { NavLink, Route } from 'react-router-dom';
import Settings from './Settings.jsx';
import TagList from './TagList.jsx';

export default class Tags extends React.Component {
	render() {
		const path = this.props.match.path;
		const url = this.props.match.url.replace(/\/$/, '');

		return (<ModuleSettings {...this.props} name='tags' title='Tags' isLoading={false}>
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
		</ModuleSettings>);
	}
}

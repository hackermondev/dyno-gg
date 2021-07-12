import React from 'react';
import axios from 'axios';
import { NavLink, Route } from 'react-router-dom';
import ModuleSettings from '../common/ModuleSettings.jsx';
import AutorolesTab from './AutorolesTab.jsx';
import RanksTab from './RanksTab.jsx';
import Loader from '../common/Loader.jsx';

export default class Autoroles extends ModuleSettings {
	constructor(props) {
		super(props);
		this.state = {
			roles: [],
			isLoading: true,
		};
	}

	async componentWillMount() {
		try {
			let response = await axios.get(`/api/modules/${this.props.match.params.id}/roles`);
			this.setState({
				roles: response.data.roles,
				isLoading: false,
			});
		} catch (e) {
			this.setState({ error: 'Failed to get data, try again later' });
		}
	}

    render() {
		if (this.state.isLoading) {
			return <Loader />;
		}

		const path = this.props.match.path;
		const url = this.props.match.url.replace(/\/$/, '');

		return (<div id='module-autoroles' className='module-content module-settings'>
			<h3 className='title is-4'>Autoroles {this.ModuleToggle}</h3>
			<div className='has-tabs'>
				<div className='tabs'>
					<ul className='tabs'>
						<li><NavLink exact to={`${url}`} className='subtab-control' activeClassName='is-active'>Autoroles</NavLink></li>
						<li><NavLink to={`${url}/ranks`} className='subtab-control' activeClassName='is-active'>Joinable Ranks</NavLink></li>
					</ul>
				</div>
			</div>
			<Route exact path={`${path}`} render={(props) => (
				<AutorolesTab {...this.props} roles={this.state.roles} />
			)} />
			<Route path={`${path}/ranks`} render={(props) => (
				<RanksTab {...this.props} />
			)} />
		</div>);
    }
}

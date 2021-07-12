import React from 'react';
import axios from 'axios';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
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

		return (<div id='module-autoroles' className='module-content module-settings'>
			<h3 className='title is-4'>Autoroles {this.ModuleToggle}</h3>
			<Tabs selectedTabClassName='is-active' selectedTabPanelClassName='is-active'>
				<div className='has-tabs'>
					<div className='tabs'>
						<TabList>
							<Tab><a className='subtab-control'>Autoroles</a></Tab>
							<Tab><a className='subtab-control'>Joinable Ranks</a></Tab>
						</TabList>
					</div>
				</div>
				<TabPanel>
					<AutorolesTab {...this.props} roles={this.state.roles} />
				</TabPanel>
				<TabPanel>
					<RanksTab {...this.props} />
				</TabPanel>
			</Tabs>
		</div>);
    }
}

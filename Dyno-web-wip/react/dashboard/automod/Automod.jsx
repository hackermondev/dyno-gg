import React from 'react';
import axios from 'axios';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import BannedWords from './BannedWords.jsx';
import LinkBlacklist from './LinkBlacklist.jsx';
import LinkWhitelist from './LinkWhitelist.jsx';
import ModuleSettings from '../common/ModuleSettings.jsx';
import Settings from './Settings.jsx';
import Loader from './../common/Loader.jsx';

export default class Automod extends ModuleSettings {
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
		if (this.state.isLoading) {
			return <Loader />;
		}

		return (<div id='module-automod' className='module-content module-settings'>
			<h3 className='title is-4'>Automod {this.ModuleToggle}</h3>
			<Tabs selectedTabClassName='is-active' selectedTabPanelClassName='is-active'>
				<div className='has-tabs'>
					<div className='tabs'>
						<TabList>
							<Tab><a className='subtab-control'>Settings</a></Tab>
							<Tab><a className='subtab-control'>Banned Words</a></Tab>
							<Tab><a className='subtab-control'>Link Blacklist</a></Tab>
							<Tab><a className='subtab-control'>Link Whitelist</a></Tab>
						</TabList>
					</div>
				</div>
				<TabPanel>
					<Settings {...this.props} automod={this.state.automod} channels={this.state.channels} roles={this.state.roles} />
				</TabPanel>
				<TabPanel>
					<BannedWords {...this.props} automod={this.state.automod} />
				</TabPanel>
				<TabPanel>
					{<LinkBlacklist {...this.props} automod={this.state.automod} />}
				</TabPanel>
				<TabPanel>
					{<LinkWhitelist {...this.props} automod={this.state.automod} />}
				</TabPanel>
			</Tabs>
		</div>);
    }
}

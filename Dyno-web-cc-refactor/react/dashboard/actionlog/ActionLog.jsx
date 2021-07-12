import React from 'react';
import axios from 'axios';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import ModuleSettings from '../common/ModuleSettings.jsx';
import SettingsTab from './SettingsTab.jsx';
import Loader from './../common/Loader.jsx';

export default class ActionLog extends ModuleSettings {
	constructor(props) {
		super(props);
		this.state = {
			actionlog: {},
			channels: [],
			isLoading: true,
			newAccThreshold: 0
		};
	}

	async componentWillMount() {
		try {
			let response = await axios.get(`/api/modules/${this.props.match.params.id}/actionlog`);

			this.setState({
				actionlog: response.data.actionlog,
				channels: response.data.channels,
				isLoading: false,
				newAccThreshold: response.data.newAccThreshold,
			});
		} catch (e) {
			this.setState({ error: 'Failed to get data, try again later' });
		}
	}

    render() {
		if (this.state.isLoading) {
			return <Loader />;
		}

		return (<div id='module-actionlog' className='module-content module-settings'>
			<h3 className='title is-4'>Action Log {this.ModuleToggle}</h3>
			<SettingsTab {...this.props} actionlog={this.state.actionlog} channels={this.state.channels} newAccThreshold={this.state.newAccThreshold}/>
		</div>);
    }
}

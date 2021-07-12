import React from 'react';
import axios from 'axios';
import ModuleSettings from '../common/ModuleSettings.jsx';
import RichMultiSelect from '../common/RichMultiSelect.jsx';
import { updateModuleSetting } from '../service/dashboardService.js';
import Loader from '../common/Loader.jsx';

export default class Cleverbot extends ModuleSettings {
	state = {
		channels: [],
		allowedChannels: [],
		ignoredChannels: [],
		isLoading: true,
	}

	async componentWillMount() {
		try {
			let response = await axios.get(`/api/modules/${this.props.match.params.id}/cleverbot`);
			const cleverbot = response.data.cleverbot || {};

			this.setState({
				channels: response.data.channels || [],
				ignoredChannels: cleverbot.ignoredChannels || [],
				allowedChannels: cleverbot.allowedChannels || [],
				isLoading: false,
			});
		} catch (e) {
			this.setState({ error: 'Failed to get data, try again later' });
		}
	}

	handleIgnoredChannels = (props, selectedOptions) => {
		const ignoredChannels = selectedOptions.map(o => ({ id: o.value, name: o.label }));
		updateModuleSetting(props.module, 'ignoredChannels', ignoredChannels, 'Ignored Channels');
		this.setState({ ignoredChannels });
	}

	handleAllowedChannels = (props, selectedOptions) => {
		const allowedChannels = selectedOptions.map(o => ({ id: o.value, name: o.label }));
		updateModuleSetting(props.module, 'allowedChannels', allowedChannels, 'Allowed Channels');
		this.setState({ allowedChannels });
	}

    render() {
		if (this.state.isLoading) {
			return <Loader />;
		}

		const module = this.props.data.module;
		const channels = this.state.channels.filter(c => c.type === 0);

		const channelOptions = channels.map(c => ({ value: c.id, label: c.name }));
		const ignoredChannels = channels.filter(c => c.type === 0 && this.state.ignoredChannels.find(i => i.id === c.id));
		const allowedChannels = channels.filter(c => c.type === 0 && this.state.allowedChannels.find(i => i.id === c.id));

		return (<div id='module-cleverbot' className='module-content module-settings'>
			<h3 className='title is-4'>Cleverbot</h3>
			<div className='settings-top'>
				{this.ModuleToggle}
			</div>
			<div className='settings-content'>
				<h3 className='title is-5'>Ignored Channels</h3>
				<p>Cleverbot will not respond in these channels.</p>
				<RichMultiSelect
					module={module}
					setting='ignoredChannels'
					friendlyName='Ignored Channel'
					text='Ignored Channels'
					defaultValue={ignoredChannels}
					defaultOption='Select Channel'
					options={channelOptions}
					onChange={this.handleIgnoredChannels} />
			</div>
			<div className='settings-content'>
				<h3 className='title is-5'>Allowed Channels</h3>
				<p>Cleverbot will respond in these channels.</p>
				<RichMultiSelect
					module={module}
					setting='allowedChannels'
					friendlyName='Allowed Channel'
					text='Allowed Channels'
					defaultValue={allowedChannels}
					defaultOption='Select Channel'
					options={channelOptions}
					onChange={this.handleAllowedChannels} />
			</div>
		</div>);
	}
}

import React from 'react';
import axios from 'axios';
import MessageSetting from './MessageSetting.jsx';
import ModuleSettings from '../common/ModuleSettings.jsx';
import SettingCheckbox from '../common/SettingCheckbox.jsx';
import RichSettingSelect from '../common/RichSettingSelect.jsx';
import Variables from '../common/Variables.jsx';
import Loader from './../common/Loader.jsx';

export default class Announcements extends ModuleSettings {
	constructor(props) {
		super(props);
		this.state = {
			announcements: {},
			channels: [],
			isLoading: true,
		};
	}

	async componentWillMount() {
		try {
			let response = await axios.get(`/api/modules/${this.props.match.params.id}/announcements`);

			this.setState({
				announcements: response.data.announcements,
				channels: response.data.channels,
				isLoading: false,
			});
		} catch (e) {
			this.setState({ error: 'Failed to get data, try again later' });
		}
	}

	handleChannel = (selectedOption) => {
		let announcements = this.state.announcements;
		announcements.channel = selectedOption.value || false;
		this.setState({ announcements });
	}

    render() {
		if (this.state.isLoading) {
			return <Loader />;
		}

		const module = this.props.data.module;
		const announcements = this.state.announcements;
		let channels = this.state.channels.filter(c => c.type === 0);

		const channelOptions = channels.map(c => ({ value: c.id, label: c.name }));
		const defaultChannel = channels.find(c => c.id === announcements.channel);

		return (<div id='module-announcements' className='module-content module-settings'>
			<h3 className='title is-4'>Announcements {this.ModuleToggle}</h3>
			<div className='settings-content is-flex'>
				<SettingCheckbox
					module={module}
					setting='joinEnabled'
					friendlyName='Join Messages'
					defaultValue={announcements.joinEnabled || false}
					text='Enable Join Messages' />
				<SettingCheckbox
					module={module}
					setting='leaveEnabled'
					friendlyName='Leave Messages'
					defaultValue={announcements.leaveEnabled || false}
					text='Enable Leave Messages' />
				<SettingCheckbox
					module={module}
					setting='banEnabled'
					friendlyName='Ban Messages'
					defaultValue={announcements.banEnabled || false}
					text='Enable Ban Messages' />
				<SettingCheckbox
					module={module}
					setting='dmJoins'
					friendlyName='DM Join Messages'
					defaultValue={announcements.dmJoins || false}
					text='Send Join Messages as a DM' />
			</div>
			<div className='settings-content'>
				<RichSettingSelect
					module={module}
					setting='channel'
					friendlyName='Announcement Channel'
					text='Announcement Channel'
					defaultValue={defaultChannel}
					defaultOption='Select Channel'
					options={channelOptions}
					onChange={this.handleChannel} />
			</div>
			<div className='settings-group'>
				<div className='settings-content is-half'>
					<h3 className='title is-5'>Join Messages</h3>
					<MessageSetting
						module={module}
						setting='joinMessage'
						friendlyName='Join Message'
						text='Join Message'
						defaultValue={announcements.joinMessage}
						placeholder='{user} has joined.' />
				</div>
				<div className='settings-content is-half'>
					<h3 className='title is-5'>Leave Messages</h3>
					<MessageSetting
						module={module}
						setting='leaveMessage'
						friendlyName='Leave Message'
						text='Leave Message'
						defaultValue={announcements.leaveMessage}
						placeholder='{user} has left.' />
				</div>
				<div className='settings-content is-half'>
					<h3 className='title is-5'>Ban Messages</h3>
					<MessageSetting
						module={module}
						setting='banMessage'
						friendlyName='Ban Message'
						text='Ban Message'
						defaultValue={announcements.banMessage}
						placeholder='{user} was banned.' />
				</div>
				<div className='settings-content is-half'>
					<h3 className='title is-5'>Variables</h3>
					<p>You can use these variables in the message boxes below.</p>
					<Variables />
				</div>
			</div>
		</div>);
    }
}

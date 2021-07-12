import React from 'react';
import axios from 'axios';
import MessageSetting from './MessageSetting.jsx';
import ModuleSettings from '../../common/ModuleSettings.jsx';
import SettingCheckbox from '../common/SettingCheckbox.jsx';
import RichSelect from '../../common/RichSelect.jsx';
import RichSettingSelect from '../common/RichSettingSelect.jsx';
import Variables from '../../common/Variables.jsx';
import Loader from '../../common/Loader.jsx';
import FeatureLocker from '../../common/FeatureLocker.jsx';
import { addModuleItem, updateModuleSetting } from '../service/dashboardService.js';

export default class VoiceTextLinking extends ModuleSettings {
	state = {
		channels: [],
		voicetextlinking: {},
		isLoading: true,
		voiceOption: false,
		textOption: false,
	}

	async componentWillMount() {
		this.updateState();
	}

	async updateState() {
		try {
			let response = await axios.get(`/api/modules/${this.props.match.params.id}/voicetextlinking`);

			this.setState({
				channels: response.data.channels || [],
				voicetextlinking: response.data.voicetextlinking || {},
				isLoading: false,
			});
		} catch (e) {
			this.setState({ error: 'Failed to get data, try again later' });
		}
	}

	handleTextChannel = (props, textOption) => {
		this.setState({ textOption });
	}

	handleVoiceChannel = (props, voiceOption) => {
		this.setState({ voiceOption });
	}

	addBinding = async () => {
		const { voicetextlinking, textOption, voiceOption } = this.state;

		if (!textOption || !voiceOption) {
			return _showError(`Please select a voice and text channel.`);
		}

		const binding = {
			textChannel: textOption.value,
			voiceChannel: voiceOption.value,
		};

		try {
			await addModuleItem(this.props.data.module, 'channels', binding, 'Voice Text Binding');
		} catch (err) {
			return _showError('Something went wrong.');
		}

		voicetextlinking.channels = voicetextlinking.channels || [];
		voicetextlinking.channels.push(binding);

		this.setState({ voicetextlinking, textOption: false, voiceOption: false });
		this.updateState();
	}

	deleteBinding = async (binding) => {
		try {
			const { voicetextlinking } = this.state;
			const index = voicetextlinking.channels.findIndex(c => c._id === binding._id);
			if (index > -1) {
				voicetextlinking.channels.splice(index, 1);
				updateModuleSetting(this.props.data.module, 'channels', voicetextlinking.channels, 'Voice Text Binding');
				this.setState({ voicetextlinking });
			}
		} catch (err) {
			return;
		}
	}

    render() {
		if (this.state.isLoading) {
			return <Loader />;
		}

		const module = this.props.data.module;
		const { voicetextlinking } = this.state;
		const bindings = voicetextlinking.channels || [];

		const boundTextChannels = bindings.map(b => b.textChannel) || [];
		const boundVoiceChannels = bindings.map(b => b.voiceChannel) || [];

		const textOptions = this.state.channels
			.filter(c => c.type === 0 && !boundTextChannels.includes(c.id))
			.map(c => ({ value: c.id, label: c.name }));
		const voiceOptions = this.state.channels
			.filter(c => c.type === 2 && !boundVoiceChannels.includes(c.id))
			.map(c => ({ value: c.id, label: c.name }));

		return (
		<FeatureLocker isLocked={!this.props.data.isPremium}>
			<div id='module-voicetextlinking' className='module-content module-settings'>
				<h3 className='title is-4'>Voice Text Linking {this.ModuleToggle}</h3>
				<div className='settings-content is-flex'>
					<SettingCheckbox
						module={module}
						setting='announceMember'
						friendlyName='Join/Leave Messages'
						defaultValue={voicetextlinking.announceMember || false}
						text='Show join/leave messages' />
					<SettingCheckbox
						module={module}
						setting='purgeChannel'
						friendlyName='Purge Channel'
						defaultValue={voicetextlinking.purgeChannel || false}
						text='Purge channel when empty' />
				</div>
				<div className='settings-content'>
					<h3 className='title is-5'>About</h3>
					<p>Voice Text Linking will give members access to a text channel when joining a voice channel.</p>
				</div>
				<div className='settings-group'>
					<div className='settings-content is-half'>
						<h3 className='title is-5'>Add Channel Binding</h3>
						<RichSelect
							text='Voice Channel'
							defaultValue={this.state.voiceOption}
							defaultOption='Select Channel'
							options={voiceOptions}
							onChange={this.handleVoiceChannel} />
						<RichSelect
							text='Text Channel'
							defaultValue={this.state.textOption}
							defaultOption='Select Channel'
							options={textOptions}
							onChange={this.handleTextChannel} />
						<div className='control'>
							<a className='button is-info' onClick={this.addBinding}>Add</a>
						</div>
					</div>
					<div className='settings-content is-half'>
						<h3 className='title is-5'>Message Settings</h3>
						<MessageSetting
							module={module}
							setting='joinMessage'
							friendlyName='Join Message'
							text='Join Message'
							defaultValue={voicetextlinking.joinMessage}
							placeholder='{user} has joined.' />
						<MessageSetting
							module={module}
							setting='leaveMessage'
							friendlyName='Leave Message'
							text='Leave Message'
							defaultValue={voicetextlinking.leaveMessage}
							placeholder='{user} has left.' />
					</div>
				</div>
				<div className='settings-content'>
					<h3 className='title is-5'>Channel Bindings</h3>
					<table className="table is-striped">
						<thead>
							<tr>
								<th>Voice Channel</th>
								<th>Text Channel</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{bindings && bindings.map((binding, index) => {
								const textChannel = this.state.channels.find(c => c.id === binding.textChannel);
								const voiceChannel = this.state.channels.find(c => c.id === binding.voiceChannel);
								return (
									<tr key={index}>
										<td>{voiceChannel ? voiceChannel.name : 'Deleted Channel'}</td>
										<td>#{textChannel ? textChannel.name : 'deleted-channel'}</td>
										<td><a className='button is-danger' onClick={this.deleteBinding.bind(this, binding)}>Remove</a></td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>
		</FeatureLocker>);
    }
}

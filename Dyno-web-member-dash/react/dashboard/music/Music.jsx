import React from 'react';
import axios from 'axios';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import ModuleSettings from '../../common/ModuleSettings.jsx';
import SettingCheckbox from '../common/SettingCheckbox.jsx';
import RichSettingSelect from '../common/RichSettingSelect.jsx';
import Loader from '../../common/Loader.jsx';
import Playlist from './Playlist.jsx';

export default class Music extends ModuleSettings {
	state = {
		music: {
			channel: false,
			role: false,
		},
		channels: [],
		roles: [],
		isLoading: true,
	}

	async componentWillMount() {
		try {
			let response = await axios.get(`/api/modules/${this.props.match.params.id}/music`);
			this.setState({ isLoading: false });

			this.setState({
				music: response.data.music,
				channels: response.data.channels,
				roles: response.data.roles,
			});
		} catch (e) {
			this.setState({ error: 'Failed to get data, try again later' });
		}
	}

	handleChannel = (type, selectedOption) => {
		let music = this.state.music;
		music[type] = selectedOption.value || false;
		this.setState({ music });
	}

	handleRole = (selectedOption) => {
		let music = this.state.music;
		music.role = selectedOption.value || false;
		this.setState({ music });
	}

	handleSetting = (props, isEnabled) => {
		let music = this.state.music;
		music[props.setting] = isEnabled;
		this.setState({ music });
	}

    render() {
		if (this.state.isLoading) {
            return <Loader />;
        }
		const module = this.props.data.module;
		const music = this.state.music;
		const channels = this.state.channels.filter(c => c.type === 0);
		const voiceChannels = this.state.channels.filter(c => c.type === 2);
		const roles = this.state.roles;

		const channelOptions = channels.map(c => ({ value: c.id, label: c.name }));
		const voiceChannelOptions = voiceChannels.map(c => ({ value: c.id, label: c.name }));
		const musicChannel = channels.find(c => c.id === music.channel);
		const autojoinChannel = voiceChannels.find(c => c.id === music.autojoinChannel);

		console.log(autojoinChannel);

		const roleOptions = roles.map(r => ({ value: r.id, label: r.name }));
		const defaultRole = roles.find(r => r.id === music.role);

		return (<div id='module-music' className='module-content module-settings'>
			<h3 className='title is-4'>Music {this.ModuleToggle}</h3>
			<Tabs selectedTabClassName='is-active' selectedTabPanelClassName='is-active'>
				<div className='has-tabs'>
					<div className='tabs'>
						<TabList>
							<Tab><a className='subtab-control'>Music Settings</a></Tab>
							<Tab><a className='subtab-control'>Music Queue</a></Tab>
						</TabList>
					</div>
				</div>
				<TabPanel>
					<div className='settings-content is-flex'>
						{/* <h3 className='title is-5'>Settings</h3> */}
						<SettingCheckbox
							module={module}
							setting='repeat'
							friendlyName='Repeat playlist'
							defaultValue={music.repeat || false}
							text='Repeat playlist'
							helpText='The playlist will loop and no songs will be removed. Same as ?q repeat.'
							onChange={this.handleSetting} />
						<SettingCheckbox
							module={module}
							setting='musicModOnly'
							friendlyName='Limit to Mod/DJ'
							defaultValue={music.musicModOnly || false}
							text='Limit commands to Mod/DJ'
							helpText='Only server moderators and users with the DJ role can use music commands.'
							onChange={this.handleSetting} />
						<SettingCheckbox
							module={module}
							setting='channelonly'
							friendlyName='Channel Limit'
							defaultValue={music.channelonly || false}
							text='Limit commands to music channel'
							helpText='Commands will only work in the music channel.'
							onChange={this.handleSetting} />
						<SettingCheckbox
							module={module}
							setting='skipEnabled'
							friendlyName='Skip voting'
							defaultValue={music.skipEnabled || false}
							text='Skip voting'
							helpText='When 60% of the users in the voice channel use ?skip, the current song will be skipped.'
							onChange={this.handleSetting} />
					</div>
					<div className='settings-group'>
						<div className='settings-content is-half'>
							<h3 className='title is-5'>Music Channel</h3>
							<p>This is the channel where <a href='/commands#/Music'>music</a> commands will be used.</p>
							<RichSettingSelect
								module={module}
								setting='channel'
								friendlyName='Music Channel'
								text='Music Channel'
								defaultValue={musicChannel}
								defaultOption='Select Channel'
								options={channelOptions}
								onChange={this.handleChannel.bind(this, 'channel')} />
						</div>
						<div className='settings-content is-half'>
							<h3 className='title is-5'>DJ Role</h3>
							<p>The DJ role can use moderator-only music commands.</p>
							<RichSettingSelect
								module={module}
								setting='role'
								friendlyName='DJ Role'
								text='DJ Role'
								defaultValue={defaultRole}
								defaultOption='Select Role'
								options={roleOptions}
								onChange={this.handleRole} />
						</div>
						{this.props.data.isPremium && (
							<div className='settings-content is-half'>
								<h3 className='title is-5'>Auto Join Channel</h3>
								<p>Dyno will automatically begin playing when someone joins this channel.</p>
								<RichSettingSelect
									module={module}
									setting='autojoinChannel'
									friendlyName='Auto Join Channel'
									text='Auto Join Channel'
									defaultValue={autojoinChannel}
									defaultOption='Select Channel'
									options={voiceChannelOptions}
									onChange={this.handleChannel.bind(this, 'autojoinChannel')} />
							</div>
						)}
					</div>
				</TabPanel>
				<TabPanel>
					<Playlist {...this.props} />
				</TabPanel>
			</Tabs>
		</div>);
	}
}

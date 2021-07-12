import React from 'react';
import axios from 'axios';
import SettingCheckbox from '../common/SettingCheckbox.jsx';
import RichMultiSelect from '../common/RichMultiSelect.jsx';
import RichSettingSelect from '../common/RichSettingSelect.jsx';
import { updateModuleSetting } from '../service/dashboardService.js';
import { updateModRoles } from './service/moderationService.js';
import Loader from '../common/Loader.jsx';

export default class SettingsTab extends React.Component {
	state = {
		channels: [],
		moderation: {
			dmBans: false,
			deleteCommands: false,
			respondWithReasons: false,
			channel: false,
		},
		modRoles: [],
		protectedRoles: false,
		roles: [],
		isLoading: true,
	}

	async UNSAFE_componentWillMount() {
		try {
			let response = await axios.get(`/api/modules/${this.props.match.params.id}/moderation`);

			this.setState({
				moderation: response.data.moderation || {},
				modRoles: response.data.modRoles || [],
				channels: response.data.channels || [],
				roles: response.data.roles || [],
				protectedRoles: response.data.moderation.protectedRoles || [],
				isLoading: false,
			});
		} catch (e) {
			this.setState({ error: 'Failed to get data, try again later' });
		}
	}

	updateModRoles = (props, selectedOptions) => {
		const modRoles = selectedOptions.map(o => o.value);
		updateModRoles(modRoles);
		this.setState({ modRoles });
	}

	updateProtectedRoles = (props, selectedOptions) => {
		const protectedRoles = selectedOptions.map(o => ({ id: o.value, name: o.label }));
		updateModuleSetting(props.module, 'protectedRoles', protectedRoles, 'Protected Roles');
		this.setState({ protectedRoles });
	}

	handleLogChannel = (selectedOption) => {
		let moderation = this.state.moderation;
		moderation.channel = selectedOption.value || false;
		this.setState({ moderation });
	}

	handleMessage(type, event) {
		const { moderation } = this.state;
		moderation[type.key] = event.target.value;
		this.setState({ moderation });
	}

	saveMessage(type) {
		updateModuleSetting(this.props.module, type.key, this.state.moderation[type.key], type.name);
	}

	render() {
		if (this.state.isLoading) {
			return <Loader />;
		}

		const module = this.props.data.module;
		const moderation = this.state.moderation;
		const channels = this.state.channels.filter(c => c.type === 0);
		const roles = this.state.roles;

		const defaultChannel = channels.find(c => c.id === this.state.moderation.channel);
		const roleOptions = roles.map(c => ({ value: c.id, label: c.name }));
		const modRoles = roles.filter(r => this.state.modRoles.includes(r.id));
		const protectedRoles = roles.filter(r => this.state.protectedRoles.find(i => i.id === r.id));

		const messageTypes = [
			{ key: 'banMessage', name: 'Ban Message', defaultValue: '***{user} was banned***' },
			{ key: 'unbanMessage', name: 'Unban Message', defaultValue: '***{user} was unbanned***' },
			{ key: 'softbanMessage', name: 'Softban Message', defaultValue: '***{user} was softbanned***' },
			{ key: 'kickMessage', name: 'Kick Message', defaultValue: '***{user} was kicked***' },
			{ key: 'muteMessage', name: 'Mute Message', defaultValue: '***{user} was muted***' },
			{ key: 'unmuteMessage', name: 'Unmute Message', defaultValue: '***{user} was unmuted***' },
		];

		return (<div id="moderation-settings" className='settings-panel'>
			<div className='settings-content is-flex'>
				<SettingCheckbox module={module} setting='dmBans'
					friendlyName='DM Users'
					defaultValue={this.state.moderation.dmBans || false}
					helpText='This will notify the user that they were muted/kicked/banner via DM.'
					text='DM users on kick/ban/mute' />
				<SettingCheckbox module={module} setting='deleteCommands'
					friendlyName='Delete Mod Commands'
					defaultValue={this.state.moderation.deleteCommands || false}
					text='Delete mod commands after executed' />
				<SettingCheckbox module={module} setting='respondWithReasons'
					friendlyName='Respond with reason'
					defaultValue={this.state.moderation.respondWithReasons || false}
					helpText='This will include the reason in the mute/kick/ban message in the chat.'
					text='Respond with Reason' />
				<SettingCheckbox module={module} setting='removeRoles'
					friendlyName='Remove roles when muted'
					defaultValue={this.state.moderation.removeRoles || false}
					helpText='This will remove a members roles when they are muted, and give them back when unmuted.'
					text='Remove roles when muted' />
				<SettingCheckbox module={module} setting='disableDelete'
					friendlyName="Preserve messages on ban"
					defaultValue={this.state.moderation.disableDelete || false}
					helpText="When this is enabled, a user's messages will not be deleted when they are banned."
					text='Preserve messages on ban' />
				<SettingCheckbox module={module} setting='matchEnabled'
					friendlyName="Enable ban match command"
					defaultValue={this.state.moderation.matchEnabled || false}
					helpText="When this is enabled, server managers/admins will be able to use the ban match command in the event of a raid see ban command help for more info."
					text='Enable ban match command' />
			</div>
			<div className='settings-group'>
				<div className='settings-content is-third'>
					<h3 className='title is-5'>Moderation Log Channel</h3>
					<p>Moderator actions will be logged in this channel.</p>
					<RichSettingSelect
						module={module}
						setting='channel'
						friendlyName='Log Channel'
						text='Log Channel'
						defaultValue={defaultChannel}
						defaultOption='Select Channel'
						options={channels}
						onChange={this.handleLogChannel} />
				</div>
				<div className='settings-content is-third'>
					<h3 className='title is-5'>Moderator Roles</h3>
					<p>Members in moderator roles will have access to <a href='/commands#/Moderator'>Moderator</a> commands.</p>
					<RichMultiSelect
						module={module}
						setting='modRoles'
						friendlyName='Moderator Role'
						text='Moderator Roles'
						defaultValue={modRoles}
						defaultOption='Select Role'
						options={roleOptions}
						onChange={this.updateModRoles} />
				</div>
				<div className='settings-content is-third'>
					<h3 className='title is-5'>Protected Roles</h3>
					<p>Members in protected roles can't be muted, kicked, or banned by moderators.</p>
					<RichMultiSelect
						module={module}
						setting='protectedRoles'
						friendlyName='Protected Role'
						text='Protected Roles'
						defaultValue={protectedRoles}
						defaultOption='Select Role'
						options={roleOptions}
						onChange={this.updateProtectedRoles} />
				</div>
			</div>
			{config.isPremium && (
				<div className='settings-content is-flex'>
					<h3 className='title is-5'>Custom Responses</h3>
					{messageTypes.map(type => (
						<p key={type.key} className='control message-type'>
							<label>{type.name}</label>
							<input className='input' type='text' placeholder={type.defaultValue} value={moderation[type.key]} onChange={this.handleMessage.bind(this, type)} />
							<a className='button is-info' onClick={this.saveMessage.bind(this, type)}>Update</a>
						</p>
					))}
				</div>
			)}
		</div>);
	}
}

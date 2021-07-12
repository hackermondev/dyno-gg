import React from 'react';
import SettingSelector from './SettingSelector.jsx';
import SettingCheckbox from '../common/SettingCheckbox.jsx';
import RichSettingSelect from '../common/RichSettingSelect.jsx';
import RichMultiSelect from '../common/RichMultiSelect.jsx';
import RichNumber from '../common/RichNumber.jsx';
import { updateModuleSetting } from '../service/dashboardService.js';

export default class SettingsTab extends React.Component {
	state = {
		automod: {},
		channels: [],
		ignoredChannels: [],
		roles: [],
		ignoredRoles: [],
		selectedValue: null,
		channel: false,
	}

	componentDidMount() {
		this.updateStateWithProps(this.props);
	}

	componentWillReceiveProps(props) {
		this.updateStateWithProps(props);
	}

	updateStateWithProps(props) {
		let { automod, channels, roles } = props;
		automod = automod || {};
		this.setState({
			automod,
			channels: channels || false,
			channel: automod.channel || false,
			ignoredChannels: automod.ignoredChannels || [],
			roles: roles || false,
			ignoredRoles: automod.ignoredRoles || [],
		});
	}

	handleLogChannel = (selectedOption) => {
		this.setState({ channel: selectedOption.value || false });
	}

	handleIgnoredChannels = (props, selectedOptions) => {
		const ignoredChannels = selectedOptions.map(o => ({ id: o.value, name: o.label }));
		updateModuleSetting(props.module, 'ignoredChannels', ignoredChannels, 'Ignored Channels');
		this.setState({ ignoredChannels });
	}

	handleAllowedRoles = (props, selectedOptions) => {
		const ignoredRoles = selectedOptions.map(o => ({ id: o.value, name: o.label }));
		updateModuleSetting(props.module, 'ignoredRoles', ignoredRoles, 'Allowed Roles');
		this.setState({ ignoredRoles });
	}

	getDefaultValue(setting) {
		let value = false;

		const options = [
			{ value: 'delete', label: 'Delete' },
			{ value: 'warn', label: 'Warn' },
			{ value: 'automute', label: 'Auto Mute' },
			{ value: 'instantban', label: 'Instant Ban' },
		];

		if (typeof this.props.automod[setting] === 'object') {
			value = options.filter(o => this.props.automod[setting][o.value]);
		}

		return value;
	}

	updateNumber = (type, friendlyName, number) => {
		updateModuleSetting(this.props.data.module, type, number, friendlyName);
	}

    render() {
		const { automod } = this.state;
		const module = this.props.data.module;
		const roles = this.state.roles;
		const channels = this.state.channels.filter(c => (c.type === 0 || c.type === 4));
		const defaultChannel = channels.find(c => c.id === this.state.channel);
		const channelOptions = channels.map(c => ({ value: c.id, label: c.name }));
		const ignoredChannels = channels.filter(c => this.state.ignoredChannels.find(i => i.id === c.id));
		const ignoredRoles = roles.filter(r => this.state.ignoredRoles.find(i => i.id === r.id));
		const roleOptions = roles.map(r => ({ value: r.id, label: r.name }));

		return (<div id="automod-settings" className='settings-panel'>
			<div className='settings-group'>
				<div className='settings-content is-half is-flex'>
					{/* <h3 className='title is-5'>Settings</h3> */}
					<SettingCheckbox
						module={module}
						setting='muteAfter'
						friendlyName='Enable Automute'
						defaultValue={automod.muteAfter || false}
						text='Enable Automute'
						helpText='Automute mutes users when they violate all filters except banned words and all caps.' />
					<SettingCheckbox
						module={module}
						setting='disableGlobal'
						friendlyName='Default Words'
						defaultValue={automod.disableGlobal || false}
						text='Disable Default Banned Words'
						helpText='Automod includes a small list of default banned words, if you want to disable these, check this box.' />
				</div>
				<div className='settings-content is-half'>
					<h3 className='title is-5'>Log Channel</h3>
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
			</div>
			<div className='automod-toggles'>
				<h3 className='title is-5'>Filter Options</h3>
				<SettingSelector module={module} {...this.props}
					id='select-badEnabled'
					setting='badEnabled'
					label='Banned Words'
					multi={true}
					value={this.getDefaultValue('badEnabled')} />
				<SettingSelector module={module} {...this.props}
					id='select-capsEnabled'
					setting='capsEnabled'
					label='All Caps'
					multi={true}
					value={this.getDefaultValue('capsEnabled')} />
				<SettingSelector module={module} {...this.props}
					id='select-dupEnabled'
					setting='dupEnabled'
					label='Duplicate Text'
					multi={true}
					helpText='Duplicate Text detects a message that contains repeated text.'
					value={this.getDefaultValue('dupEnabled')} />
				<SettingSelector module={module} {...this.props}
					id='select-rateEnabled'
					setting='rateEnabled'
					label='Fast Message Spam'
					multi={true}
					helpText='Fast Message Spam detects when a user sends 5 messages during a 5 second timespan. '
					value={this.getDefaultValue('rateEnabled')} />
				<SettingSelector module={module} {...this.props}
					id='select-invitesEnabled'
					setting='invitesEnabled'
					label='Discord Invites'
					multi={true}
					value={this.getDefaultValue('invitesEnabled')} />
				<SettingSelector module={module} {...this.props}
					id='select-linksEnabled'
					setting='linksEnabled'
					label='All Links'
					multi={true}
					helpText='All Links detects any message that contains a link.'
					value={this.getDefaultValue('linksEnabled')} />
				<SettingSelector module={module} {...this.props}
					id='select-mentionsEnabled'
					setting='mentionsEnabled'
					label='Mass Mentions'
					multi={true}
					instantBan={true}
					helpText='Mass Mentions detects when a single message contains a certain number of mentions (different user per mention). You could change the number of mentions below.'
					value={this.getDefaultValue('mentionsEnabled')} />
				<SettingSelector module={module} {...this.props}
					id='select-cooldownEnabled'
					setting='cooldownEnabled'
					label='Link Cooldown'
					multi={true}
					helpText='Link Cooldown is violated when links are sent within a period of time after posting a link. Set the cooldown time below.'
					value={this.getDefaultValue('cooldownEnabled')} />
				<SettingSelector module={module} {...this.props}
					id='select-attachmentsEnabled'
					setting='attachmentsEnabled'
					label='Image Spam'
					multi={true}
					helpText='Image spam detects multiple images sent at once or within a time span of 10 seconds.'
					value={this.getDefaultValue('attachmentsEnabled')} />
				<SettingSelector module={module} {...this.props}
					id='select-emojisEnabled'
					setting='emojisEnabled'
					label='Emoji Spam'
					multi={true}
					value={this.getDefaultValue('emojisEnabled')} />
				<SettingSelector module={module} {...this.props}
					id='select-spoilersEnabled'
					setting='spoilersEnabled'
					label='Spoilers'
					multi={true}
					helpText='Delete text or image spoilers.'
					value={this.getDefaultValue('spoilersEnabled')} />
				<SettingSelector module={module} {...this.props}
					id='select-selfbotEnabled'
					setting='selfbotEnabled'
					label='Selfbot Detection'
					multi={true}
					helpText='Selfbot Detection will detect messages sent by users containing rich embeds.'
					value={this.getDefaultValue('selfbotEnabled')} />
				{/* <SettingSelector module={module} {...this.props}
					id='select-regionalEnabled'
					setting='regionalEnabled'
					label='Regional Indicator Spam'
					multi={true}
					value={this.getDefaultValue('regionalEnabled')} /> */}
				<RichNumber
					min={1}
					max={1440}
					label='Automute Time (minutes)'
					defaultValue={automod.muteTime || 10}
					onClick={this.updateNumber.bind(this, 'muteTime', 'Mute Time')} />
				<RichNumber
					min={1}
					max={10}
					label='Mute Violations (count)'
					defaultValue={automod.muteCount || 3}
					onClick={this.updateNumber.bind(this, 'muteCount', 'Mute Violations')} />
				<RichNumber
					min={3}
					max={300}
					label='Link Cooldown (seconds)'
					defaultValue={automod.linkCooldown || 10}
					onClick={this.updateNumber.bind(this, 'linkCooldown', 'Link Cooldown')} />
				<RichNumber
					min={3}
					max={10}
					label='Max Emoji Count'
					defaultValue={automod.emojiCount || 4}
					onClick={this.updateNumber.bind(this, 'emojiCount', 'Emoji Count')} />
				<RichNumber
					min={4}
					max={20}
					label='Mass Mention Count'
					defaultValue={automod.mentionCount || 10}
					onClick={this.updateNumber.bind(this, 'mentionCount', 'Mention Count')} />
			</div>
			<div className='settings-group'>
				<div className='settings-content is-half'>
					<h3 className='title is-5'>Ignored Channels</h3>
					<p>Message sent in these channels will not trigger Automod.</p>
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
				<div className='settings-content is-half'>
					<h3 className='title is-5'>Allowed Roles</h3>
					<p>Members in these roles will not trigger Automod.</p>
					<RichMultiSelect
						module={module}
						setting='ignoredRoles'
						friendlyName='Ignored Role'
						text='Ignored Roles'
						defaultValue={ignoredRoles}
						defaultOption='Select Role'
						options={roleOptions}
						onChange={this.handleAllowedRoles} />
				</div>
			</div>
		</div>);
	}
}

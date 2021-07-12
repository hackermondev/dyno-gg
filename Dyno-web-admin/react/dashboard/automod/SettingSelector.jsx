import React from 'react';
import Modal from 'react-responsive-modal';
import Select from 'react-select';
import Help from '../common/Help.jsx';
import RichMultiSelect from '../common/RichMultiSelect.jsx';
import NumericInput from 'react-numeric-input';
// import { updateModuleSetting } from '../service/dashboardService.js';
import { updateFilter, updateFilterSettings } from './service/automodService.js';
import '!style-loader!css-loader!react-select/dist/react-select.css';
import '!style-loader!css-loader!../styles/selector.css';
import '!style-loader!css-loader!./styles/select.css';

export default class SettingSelector extends React.Component {
	state = {
		automod: {},
		channels: [],
		roles: [],
		selectedOptions: null,
		options: null,
		settingsModalOpen: false,
		ignoredChannels: [],
		ignoredRoles: [],
		muteCount: null,
		muteTime: null,
	}

	handleChange = (selectedOptions) => {
		const { options } = this.state;
		if (selectedOptions[0] && selectedOptions.find(o => o.value === 'all')) {
			selectedOptions = options.filter(o => o.value !== 'all');
			if (this.props.instantBan) {
				selectedOptions = selectedOptions.filter(o => o.value !== 'instantban');
			}
		} else {
			const banOption = selectedOptions.find(o => o.value === 'instantban');
			if (banOption) {
				selectedOptions = [banOption];
			}
		}
		this.setState({ selectedOptions });

		let updateOptions = selectedOptions.reduce((a, b) => {
			a[b.value] = true;
			return a;
		}, {});

		if (!selectedOptions.length) {
			updateOptions = false;
		}

		updateFilter(this.props.setting, updateOptions, this.props.label);
		// updateModuleSetting(this.props.module, this.props.setting, updateOptions, this.props.label);
	}

	componentWillMount() {
		const options = this.getOptions();
		this.setState({ options });
	}

	componentDidMount() {
		let { automod, channels, roles } = this.props;
		const setting = automod[this.props.setting] || {};
		const ignoredChannels = setting.ignoredChannels || [];
		const ignoredRoles = setting.ignoredRoles || [];

		this.setState({
			automod: automod || {},
			channels: channels || [],
			roles: roles || [],
			selectedOptions: this.props.value,
			muteCount: setting.muteCount || false,
			muteTime: setting.muteTime || false,
			ignoredChannels, ignoredRoles,
		});
	}

	componentWillReceiveProps(props) {
		let { automod, channels, roles } = props;
		const setting = automod[props.setting] || {};
		const ignoredChannels = setting.ignoredChannels || [];
		const ignoredRoles = setting.ignoredRoles || [];

		this.setState({
			automod: automod || {},
			channels: channels || [],
			roles: roles || [],
			selectedOptions: props.value,
			muteCount: setting.muteCount || false,
			muteTime: setting.muteTime || false,
			ignoredChannels, ignoredRoles,
		});
	}

	getOptions() {
		const { selectedOptions } = this.state;

		const muteDisabled = selectedOptions && selectedOptions.find(o => o.value === 'instantban');
		const options = [
			{ value: 'delete', label: 'Delete' },
			{ value: 'warn', label: 'Warn' },
			{
				value: 'automute',
				label: muteDisabled ? 'Auto Mute (Disabled)' : 'Auto Mute',
				disabled: muteDisabled,
			},
		];

		if (this.props.instantBan) {
			const disabled = selectedOptions && selectedOptions.find(o => o.value === 'automute');
			options.push({
				value: 'instantban',
				label: disabled ? 'Instant Ban (Disabled)' : 'Instant Ban',
				disabled: disabled,
			});
		}

		options.push({
			value: 'all',
			label: 'Select All',
		});

		return options;
	}

	openSettings = () => {
		this.setState({ settingsModalOpen: true });
	}

	closeSettings = () => {
		this.setState({ settingsModalOpen: false });
	}

	handleIgnoredChannels = (props, selectedOptions) => {
		const ignoredChannels = selectedOptions.map(o => ({ id: o.value, name: o.label }));
		this.setState({ ignoredChannels });
	}

	handleAllowedRoles = (props, selectedOptions) => {
		const ignoredRoles = selectedOptions.map(o => ({ id: o.value, name: o.label }));
		this.setState({ ignoredRoles });
	}

	handleMuteTime = (number) => {
		if (!number || isNaN(number)) {
			return;
		}
		this.setState({ muteTime: number });
	}

	handleMuteCount = (number) => {
		if (!number || isNaN(number)) {
			return;
		}
		this.setState({ muteCount: number });
	}

	saveSettings = () => {
		const { setting } = this.props;
		const { ignoredChannels, ignoredRoles, muteTime, muteCount } = this.state;
		updateFilterSettings(setting, { ignoredChannels, ignoredRoles, muteTime, muteCount }, this.props.label);
	}

	render() {
		const options = this.getOptions();

		const module = this.props.data.module;
		const roles = this.state.roles;
		const channels = this.state.channels.filter(c => (c.type === 0 || c.type === 4));
		const channelOptions = channels.map(c => ({ value: c.id, label: c.name }));

		const ignoredChannels = channels.filter(c =>
			this.state.ignoredChannels &&
			this.state.ignoredChannels.find(i => i.id === c.id));

		const ignoredRoles = roles.filter(r =>
			this.state.ignoredRoles &&
			this.state.ignoredRoles.find(i => i.id === r.id));

		const roleOptions = roles.map(r => ({ value: r.id, label: r.name }));

		const modalClasses = {
            modal: 'filter-modal',
        };

		return (
			<div className='automod-selector rich-select control'>
				<div className='rich-select-top'>
					<label className='label'>
						{this.props.label}
						{this.props.helpText && (<Help text={this.props.helpText} />)}
						<a className='filter-settings' onClick={this.openSettings}>
							<span className='icon is-link'>
								<i className='fa fa-cog'></i>
							</span>
						</a>
					</label>
				</div>
				<Select
					id={`select-${this.props.id}`}
					name={this.props.id}
					multi={this.props.multi}
					value={this.state.selectedOptions}
					placeholder='Disabled'
					clearable={false}
					onChange={this.handleChange}
					searchable={true}
					options={options} />
				<Modal open={this.state.settingsModalOpen} classNames={modalClasses} little={true} onClose={this.closeSettings}>
					<h3>{this.props.label}</h3>
					<RichMultiSelect
						module={module}
						setting='ignoredChannels'
						friendlyName='Disabled Channel'
						text='Disabled Channels'
						label='Disabled Channels'
						defaultValue={ignoredChannels}
						defaultOption='Select Channel'
						options={channelOptions}
						onChange={this.handleIgnoredChannels} />
					<RichMultiSelect
						module={module}
						setting='ignoredRoles'
						friendlyName='Disabled Role'
						text='Disabled Roles'
						label='Disabled Roles'
						defaultValue={ignoredRoles}
						defaultOption='Select Role'
						options={roleOptions}
						onChange={this.handleAllowedRoles} />
					<label className='label'>Mute Violations (Count)</label>
					<NumericInput
						min={1}
						max={1440}
						step={1}
						strict={true}
						style={false}
						value={this.state.muteCount || this.state.automod.muteCount}
						onChange={this.handleMuteCount} />
					<label className='label'>Mute Time (Minutes)</label>
					<NumericInput
						min={1}
						max={1440}
						step={1}
						strict={true}
						style={false}
						value={this.state.muteTime || this.state.automod.muteTime}
						onChange={this.handleMuteTime} />
					<button className='button is-success is-pulled-right' onClick={this.saveSettings}>Save</button>
				</Modal>
			</div>
		)
	}
}

import React from 'react';
import Command from './Command.jsx';
import Modal from 'react-responsive-modal';
import RichMultiSelect from '../common/RichMultiSelect.jsx';
import { saveCommandGroupSettings, updateCommandGroup } from './service/CommandService';

export default class CommandGroup extends React.Component {
	state = {
		channels: [],
		roles: [],
		allowedChannels: [],
		ignoredChannels: [],
		allowedRoles: [],
		ignoredRoles: [],
		settingsOpen: false,
		enableOpen: false,
		disableOpen: false,
	};

    componentDidMount() {
		this.updateState(this.props);
	}

	componentWillReceiveProps(props) {
		this.updateState(props);
	}

	updateState(props) {
		const state = {
			channels: props.channels || [],
			roles: props.roles || [],
			isEnabled: props.defaultValue,
		};

		if (props.command) {
			state.allowedChannels = (state.allowedChannels && state.allowedChannels.length) ? state.allowedChannels : props.command.allowedChannels || [];
			state.ignoredChannels = (state.ignoredChannels && state.ignoredChannels.length) ? state.ignoredChannels : props.command.ignoredChannels || [];
			state.allowedRoles = (state.allowedRoles && state.allowedRoles.length) ? state.allowedRoles : props.command.allowedRoles || [];
			state.ignoredRoles = (state.ignoredRoles && state.ignoredRoles.length) ? state.ignoredRoles : props.command.ignoredRoles || [];
		}

		this.setState(state);
	}

	handleAllowedChannels = (props, selectedOptions) => {
		const allowedChannels = selectedOptions.map(o => ({ id: o.value, name: o.label }));
		this.setState({ allowedChannels });
	}

	handleIgnoredChannels = (props, selectedOptions) => {
		const ignoredChannels = selectedOptions.map(o => ({ id: o.value, name: o.label }));
		this.setState({ ignoredChannels });
	}

	handleAllowedRoles = (props, selectedOptions) => {
		const allowedRoles = selectedOptions.map(o => ({ id: o.value, name: o.label }));
		this.setState({ allowedRoles });
	}

	handleIgnoredRoles = (props, selectedOptions) => {
		const ignoredRoles = selectedOptions.map(o => ({ id: o.value, name: o.label }));
		this.setState({ ignoredRoles });
	}

	openSettings = () => {
		this.setState({ settingsOpen: true });
	}

	closeSettings = () => {
		this.setState({ settingsOpen: false });
	}

	async saveSettings(group) {
		const settings = {
			allowedChannels: this.state.allowedChannels.map(c => c.id || c.value).filter(c => c),
			ignoredChannels: this.state.ignoredChannels.map(c => c.id || c.value).filter(c => c),
			allowedRoles: this.state.allowedRoles.map(c => c.id || c.value).filter(c => c),
			ignoredRoles: this.state.ignoredRoles.map(c => c.id || c.value).filter(c => c),
		};

		try {
			await saveCommandGroupSettings(group, settings);
			await this.props.getCommands();
			this.closeSettings();
		} catch (err) {
			// pass
		}
	}

	async updateAll(group, enabled) {
		try {
			await updateCommandGroup(group, enabled);
			await this.props.getCommands();
			this.closeEnable();
			this.closeDisable();
		} catch (err) {
			// pass
		}
	}

	openEnable = () => {
		this.setState({ enableOpen: true });
	}

	closeEnable = () => {
		this.setState({ enableOpen: false });
	}

	openDisable = () => {
		this.setState({ disableOpen: true });
	}

	closeDisable = () => {
		this.setState({ disableOpen: false });
	}

    render() {
		let group = this.props.group;
		let className = 'subtab-content is-active';

		let commands = group.commands.map(c => {
			const result = [];
			result.push(<Command key={c.name} command={c} {...this.props} />);
			return result;
		});

		const module = this.props.data.module;

		const roles = this.state.roles;
		const channels = this.state.channels.filter(c => c.type === 0);
		const channelOptions = channels.map(c => ({ value: c.id, label: c.name }));
		const roleOptions = roles.map(r => ({ value: r.id, label: r.name }));

		const allowedChannels = channels.filter(c => c.type === 0 && this.state.allowedChannels.find(i => (i && (i.id || i)) === c.id));
		const ignoredChannels = channels.filter(c => c.type === 0 && this.state.ignoredChannels.find(i => (i && (i.id || i))  === c.id));

		const allowedRoles = roles.filter(r => this.state.allowedRoles.find(i => (i && (i.id || i)) === r.id));
		const ignoredRoles = roles.filter(r => this.state.ignoredRoles.find(i => (i && (i.id || i)) === r.id));

		const settingsClasses = {
            modal: 'command-settings-modal',
		};

		const confirmClasses = {
            modal: 'help-modal',
		};

		return (<div id={'commands-' + group.name} className={className}>
			<div className='controls command-group-controls'>
				<button className='button is-success' onClick={this.openEnable}>Enable All {group.name}</button>
				<button className='button is-danger' onClick={this.openDisable}>Disable All {group.name}</button>
				<a className='control command-settings' onClick={this.openSettings}>
					<span className='icon is-link'>
						<i className='fa fa-cog'></i>
					</span>
					<label>Settings</label>
				</a>
			</div>
			<div className='module-toggles'>{commands}</div>
			<Modal open={this.state.settingsOpen} classNames={settingsClasses} little={true} onClose={this.closeSettings}>
				<h3>Additional Permissions ({group.name})</h3>
				<p><strong>Note: This will overwrite all existing {group.name} command permissions.</strong></p>
				<RichMultiSelect
					module={module}
					setting='allowedChannels'
					friendlyName='Allowed Channel'
					text='Allowed Channels'
					label='Allowed Channels'
					defaultValue={allowedChannels}
					defaultOption='Select Channel'
					options={channelOptions}
					onChange={this.handleAllowedChannels} />
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
					setting='allowedRoles'
					friendlyName='Allowed Role'
					text='Allowed Roles'
					label='Allowed Roles'
					defaultValue={allowedRoles}
					defaultOption='Select Role'
					options={roleOptions}
					onChange={this.handleAllowedRoles} />
				<RichMultiSelect
					module={module}
					setting='ignoredRoles'
					friendlyName='Disabled Role'
					text='Disabled Roles'
					label='Disabled Roles'
					defaultValue={ignoredRoles}
					defaultOption='Select Role'
					options={roleOptions}
					onChange={this.handleIgnoredRoles} />
				<button className='button is-success is-clearfix' onClick={this.saveSettings.bind(this, group)}>Save</button>
			</Modal>
			<Modal open={this.state.enableOpen} classNames={confirmClasses} little={true} onClose={this.closeEnable}>
				<h3>Enable All {group.name}</h3>
				<p>Are you sure you want to enable all commands in this group?</p>
				<div className='button-group'>
					<button className='button is-success' onClick={this.updateAll.bind(this, group, true)}>Enable All</button>
					<button className='button is-danger' onClick={this.closeEnable}>Cancel</button>
				</div>
			</Modal>
			<Modal open={this.state.disableOpen} classNames={confirmClasses} little={true} onClose={this.closeDisable}>
				<h3>Disable All {group.name}</h3>
				<p>Are you sure you want to disable all commands in this group?</p>
				<div className='button-group'>
					<button className='button is-success' onClick={this.updateAll.bind(this, group, false)}>Disable All</button>
					<button className='button is-danger' onClick={this.closeDisable}>Cancel</button>
				</div>
			</Modal>
		</div>);
    }
}

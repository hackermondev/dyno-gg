import React from 'react';
import axios from 'axios';
import Command from './Command.jsx';
import Modal from 'react-responsive-modal';
import RichMultiSelect from '../common/RichMultiSelect.jsx';
import { saveModuleCommandSettings, updateModuleGroup, updateCommandToggle } from './service/CommandService';

export default class ModuleCommands extends React.Component {
	state = {
		commands: [],
		channels: [],
		module: {},
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
		this.getCommands(this.props.module);
	}

	UNSAFE_componentWillReceiveProps(props) {
		this.updateState(props);
	}

	async getCommands(module) {
		const url = `/api/modules/${this.props.data.guildId}/modulecommands/${module.name}`;
		try {
			let response = await axios.get(url);

			this.setState({
				commands: response.data.commands || [],
				channels: response.data.channels || [],
				roles: response.data.roles || [],
				prefix: response.data.prefix || '?',
				isLoading: false,
			});
		} catch (e) {
			this.setState({ error: 'Failed to get data, try again later' });
		}
	}

	updateState(props) {
		const state = {
			commands: props.commands || [],
			channels: props.channels || [],
			module: props.module || {},
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

	async saveSettings(module) {
		const settings = {
			allowedChannels: this.state.allowedChannels.map(c => c.id || c.value).filter(c => c),
			ignoredChannels: this.state.ignoredChannels.map(c => c.id || c.value).filter(c => c),
			allowedRoles: this.state.allowedRoles.map(c => c.id || c.value).filter(c => c),
			ignoredRoles: this.state.ignoredRoles.map(c => c.id || c.value).filter(c => c),
		};

		try {
			await saveModuleCommandSettings(module, settings);
			await this.getCommands(module);
			this.closeSettings();
		} catch (err) {
			// pass
		}
	}

	async updateAll(module, enabled) {
		try {
			await updateModuleGroup(module, enabled);
			await this.getCommands(module);
			this.closeEnable();
			this.closeDisable();
		} catch (err) {
			// pass
		}
	}

	async toggleCommand(command, checked) {
		if (command.disabled) {
			return;
		}
		updateCommandToggle(command, checked);
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
		// let group = this.props.group;
		let className = 'module-content';

		let commands = this.state.commands.map(c => {
			const result = [];
			result.push(<Command key={c.name} command={c} onToggle={this.toggleCommand} channels={this.state.channels} roles={this.state.roles} {...this.props} />);
			return result;
		});

		const module = this.state.module;
		const name = module.friendlyName || module.name;

		const roles = this.state.roles;
		const channels = this.state.channels.filter(c => (c.type === 0 || c.type === 4));
		const channelOptions = channels.map(c => ({ value: c.id, label: c.name }));
		const roleOptions = roles.map(r => ({ value: r.id, label: r.name }));

		const allowedChannels = channels.filter(c => this.state.allowedChannels.find(i => (i && (i.id || i)) === c.id));
		const ignoredChannels = channels.filter(c => this.state.ignoredChannels.find(i => (i && (i.id || i))  === c.id));

		const allowedRoles = roles.filter(r => this.state.allowedRoles.find(i => (i && (i.id || i)) === r.id));
		const ignoredRoles = roles.filter(r => this.state.ignoredRoles.find(i => (i && (i.id || i)) === r.id));

		const settingsClasses = {
            modal: 'command-settings-modal',
		};

		const confirmClasses = {
            modal: 'help-modal',
		};

		return (<div id={'commands-' + module.name} className={className}>
			<div className='module-commands'>
				<div className='command-group-heading'>
					<h3 className='title is-4'>{name}</h3>
					<a className='control command-settings' onClick={this.openSettings}>
						<span className='icon is-link'>
							<i className='fa fa-cog'></i>
						</span>
						<label>Settings</label>
					</a>
				</div>
				<div className='controls command-group-controls'>
					<button className='button group-enable' onClick={this.openEnable}>Enable All</button>
					<button className='button group-disable' onClick={this.openDisable}>Disable All</button>
				</div>
				<div className='module-toggles'>{commands}</div>
				<Modal open={this.state.settingsOpen} classNames={settingsClasses} little={true} onClose={this.closeSettings}>
					<h3>Additional Permissions ({name})</h3>
					<p><strong>Note: This will overwrite all existing {name} command permissions.</strong></p>
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
					<button className='button is-success is-clearfix' onClick={this.saveSettings.bind(this, module)}>Save</button>
				</Modal>
				<Modal open={this.state.enableOpen} classNames={confirmClasses} little={true} onClose={this.closeEnable}>
					<h3>Enable All {name}</h3>
					<p>Are you sure you want to enable all commands in this group?</p>
					<div className='button-group'>
						<button className='button is-success' onClick={this.updateAll.bind(this, module, true)}>Enable All</button>
						<button className='button is-danger' onClick={this.closeEnable}>Cancel</button>
					</div>
				</Modal>
				<Modal open={this.state.disableOpen} classNames={confirmClasses} little={true} onClose={this.closeDisable}>
					<h3>Disable All {name}</h3>
					<p>Are you sure you want to disable all commands in this group?</p>
					<div className='button-group'>
						<button className='button is-success' onClick={this.updateAll.bind(this, module, false)}>Disable All</button>
						<button className='button is-danger' onClick={this.closeDisable}>Cancel</button>
					</div>
				</Modal>
			</div>
		</div>);
    }
}

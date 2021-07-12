import React from 'react';
import Modal from 'react-responsive-modal';
import RichCheckbox from '../../common/RichCheckbox.jsx';
import RichMultiSelect from '../../common/RichMultiSelect.jsx';
import { saveCommandSettings } from './service/CommandService';

export default class RichCommandCheckbox extends React.Component {
	state = {
		channels: [],
		roles: [],
		allowedChannels: [],
		ignoredChannels: [],
		allowedRoles: [],
		ignoredRoles: [],
		isEnabled: false,
		helpOpen: false,
		settingsOpen: false,
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

	onChange = () => {
		if (this.props.disabled) {
			return;
		}
		this.props.onChange(this.props.identifier, !this.state.isEnabled);
		this.setState({ isEnabled: !this.state.isEnabled });
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

	toggleSub = (command) => {
		command.parent = this.props.command;
		this.props.onChange(command, !command.enabled);
	}

	openSettings = () => {
		this.setState({ settingsOpen: true });
	}

	closeSettings = () => {
		this.setState({ settingsOpen: false });
	}

	openHelp = () => {
		this.setState({ helpOpen: true });
	}

	closeHelp = () => {
		this.setState({ helpOpen: false });
	}

	saveSettings(command) {
		const settings = {
			allowedChannels: this.state.allowedChannels.map(c => c.id || c.value).filter(c => c),
			ignoredChannels: this.state.ignoredChannels.map(c => c.id || c.value).filter(c => c),
			allowedRoles: this.state.allowedRoles.map(c => c.id || c.value).filter(c => c),
			ignoredRoles: this.state.ignoredRoles.map(c => c.id || c.value).filter(c => c),
		};
		saveCommandSettings(command, settings);
	}

    render() {
		const module = this.props.data.module;
		const { command } = this.props;

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

		const helpClasses = {
            modal: 'help-modal command-help',
		};

		if (command.usage) {
			var usage = (typeof command.usage === 'string') ?
				(<div className='command-usage'>
					<p><strong>Usage:</strong></p>
					<ul><li>{this.props.prefix}{command.usage}</li></ul>
				</div>) :
				(<div className='command-usage'>
					<p><strong>Usage:</strong></p>
					<ul>
						{command.usage.map((u, i) => (<li key={u + i}>{this.props.prefix}{u}</li>))}
					</ul>
				</div>);
		}

		if (command.example) {
			var example = (typeof command.example === 'string') ?
				(<div className='command-example'>
					<p><strong>Example:</strong></p>
					<ul><li>{this.props.prefix}{command.example}</li></ul>
				</div>) :
				(<div className='command-example'>
					<p><strong>Examples:</strong></p>
					<ul>
						{command.example.map((u, i) => (<li key={u + i}>{this.props.prefix}{u}</li>))}
					</ul>
				</div>);
		}

		let permissions;

		if (command.permissions) {
			switch (command.permissions) {
				case 'serverMod':
					permissions = 'Moderator';
					break;
				case 'serverAdmin':
					permissions = 'Manage Server';
					break;
			}
		}

		return (
			<div className={`control rich-command is-pulled-left ${this.props.className || ''}${this.props.disabled ? 'locked' : (this.state.isEnabled ? 'enabled' : 'disabled')}`}>
				<span>
					<input
						type='checkbox'
						checked={this.state.isEnabled}
						onChange={this.onChange}
						disabled={this.props.disabled}
						/>
					<h4 className="title is-5" htmlFor={this.props.text}>{this.props.text}</h4>
				</span>
				{this.props.helpText ? (<p className="help-text">{this.props.helpText}</p>) : ''}
				{!this.props.disabled ? (
					<div className='controls'>
						<div className='control command-toggle' onClick={this.onChange}>
							<input
								className=''
								type='checkbox'
								checked={this.state.isEnabled} 
								onChange={this.onChange} />
							<label className='checkbox' htmlFor={this.props.text}>
								{this.state.isEnabled ? 'Disable' : 'Enable'}
							</label>
						</div>
						<a className='control command-settings' onClick={this.openSettings}>
							<span className='icon is-link'>
								<i className='fa fa-cog'></i>
							</span>
							<label>Settings</label>
						</a>
						<a className='control command-settings' onClick={this.openHelp}>
							<span className='icon is-link'>
								<i className='fa fa-question-circle'></i>
							</span>
							<label>Help</label>
						</a>
						<Modal open={this.state.settingsOpen} classNames={settingsClasses} little={true} onClose={this.closeSettings}>
							<h3>Additional Permissions ({command.name})</h3>
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
							{command.commands && (<h3>Sub Commands</h3>)}
							{command.commands && command.commands.map(s => (
								<RichCheckbox
									key={`${command.name}.${s.name}`}
									text={`${command.name} ${s.name}`}
									className='subcommand-toggle'
									defaultValue={s.enabled}
									onChange={this.toggleSub.bind(this, s)} />
							))}
							<button className='button is-success is-clearfix' onClick={this.saveSettings.bind(this, command)}>Save</button>
						</Modal>
					</div>) :
					(
						<div className='controls'>
							<a className='control command-settings' onClick={this.openHelp}>
								<span className='icon is-link'>
									<i className='fa fa-question-circle'></i>
								</span>
								<label>Help</label>
							</a>
						</div>
					)}
					<Modal open={this.state.helpOpen} classNames={helpClasses} little={true} onClose={this.closeHelp}>
						<h3>Command: {this.props.prefix}{command.name}</h3>
						{command.aliases.length > 1 && (
							<p><strong>Aliases:</strong> {command.aliases.slice(1).map(a => `${this.props.prefix}${a}`).join(', ')}</p>
						)}
						{command.cooldown && (
							<p><strong>Cooldown:</strong> {command.cooldown / 1000} seconds</p>
						)}
						{permissions && (
							<p><strong>Required Permissions:</strong> {permissions}</p>
						)}
						<p><strong>Description:</strong> <br />{command.description}</p>
						{command.commands && (
							<div className='command-subcommands'>
								<p><strong>Sub Commands:</strong></p>
								<ul>
									{command.commands.map((c, i) => (<li key={c + i}>{this.props.prefix}{c.usage}</li>))}
								</ul>
							</div>
						)}
						{usage}
						{example}
					</Modal>
			</div>
		);
	}
}

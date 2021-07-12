import React from 'react';
import axios from 'axios';
import RichCheckbox from '../../common/RichCheckbox.jsx';
import RichMultiSelect from '../../common/RichMultiSelect.jsx';
import RichSelect from '../../common/RichSelect.jsx';
import Variables from '../../common/Variables.jsx';
import AdvancedVariables from '../../common/AdvancedVariables.jsx';

export default class CommandModal extends React.Component {
	state = {
		customcommands: {},
		channels: [],
		prefix: '?',
		roles: [],
		formData: this.defaultFormData,
		settingsOpen: {
			permissions: false,
			options: false,
			advVars: false
		},
		contentChars: 0,
		contentLimit: false,
		nameChars: 0,
		nameLimit: false,
	}

	get defaultFormData() {
		return {
			command: '',
			response: '',
			allowedRoles: [],
			ignoredRoles: [],
			allowedChannels: [],
			ignoredChannels: [],
			responseChannel: null,
			delete: false,
			silent: false,
			noEveryone: false,
			dm: false,
		};
	}

	async componentWillMount() {
		this.setState({
			customcommands: this.props.customcommands || {},
			channels: this.props.channels || [],
			prefix: this.props.prefix || '?',
			roles: this.props.roles || [],
			formData: this.props.command ? this.addCommandData(this.props.command, this.props.channels) : this.defaultFormData,
		});
	}

	async componentWillReceiveProps(props) {
		this.setState({
			customcommands: props.customcommands || {},
			channels: props.channels || [],
			prefix: props.prefix || '?',
			roles: props.roles || [],
			formData: props.command ? this.addCommandData(props.command, props.channels) : this.defaultFormData,
		});
	}

	addCommandData(command, channels) {
		let responseChannel = null;
		if (command.responseChannel) {
			const channel = channels.find(c => c.id === command.responseChannel);
			responseChannel = { value: channel.id, label: channel.name };
		}
		this.setState({ 
			nameChars: command.command.length
		})
		this.filterContent(command.response)
		return Object.assign({}, this.defaultFormData, command, { responseChannel });
	}

	filterContent(val) {
		const regx = /{choose:([^}]*)}/g;
		let groupValue = regx.exec(val)
		let max = 0;
		if (groupValue) {
			groupValue = groupValue[1].split(';').forEach(function(choice) {
				if (choice.length > max) max = choice.length;
			});
		}
		val = val.replace(/ *\{[^)]*\} */g, '');
		this.setState({ contentChars: val.length + max })
	}

	setFormData(key, val) {
		const formData = this.state.formData;
		formData[key] = val;
		return this.setState({ formData });
	}

	handleInput(type, event) {
		var input = event.target.value;
		if (type == 'response') {
			this.filterContent(input);
			if (input.length >= 2000) {
				this.setState({
					contentLimit: true
				});
			}
			else {
				this.setState({
					contentLimit: false
				})
			}
		}
		this.setFormData(type, event.target.value);
	}

	handleSelect(type, props, selectedOption) {
		this.setFormData(type, selectedOption);
	}

	handleMultiSelect(type, props, selectedOptions) {
		this.setFormData(type, selectedOptions.map(o => ({ id: o.value, name: o.label })));
	}

	handleCheckbox(type, identifier, isEnabled) {
		this.setFormData(type, isEnabled);
	}

	addHandler = () => {
		const command = this.state.formData;
        command.responseChannel = (command.responseChannel && command.responseChannel.value) || null;
        const url = `/api/server/${this.props.match.params.id}/customcommands/create`;
        const data = { command };

        // Max length
        if (command.command.length > 72) return _showError('Command name cannot be over 72 characters.');
        if (command.response.length > 10000) return _showError('Respones cannot be over 10,000 characters.');

		const test = command.response.replace(/ *\{[^)]*\} */g, '');
        if (test.length > 2000) return _showError('Response cannot be over 2,000 characters.');

        // Invalid characters
        let illegalChars = command.command.match(/[^\w\d-_]/g);
        if (illegalChars) {
            return _showError('Illegal command characters.');
        }

        axios.post(url, data).then((res) => {
            if (res.status === 200) {
                _showSuccess(`Added Command ${command.command}`);

				try {
					this.props.onClose(command);
				} catch (err) {
					return;
				}

				this.setState({ formData: this.defaultFormData });
            } else {
                _showError('An error occurred.');
            }
		}).catch((err) => {
            if (err) {
                _showError('Something went wrong.');
			}
        });
	}

	handleCommandName = (event) => {
		let value = event.target.value;
		value = value.toLowerCase().replace(/([^\w\d-_]+)/g, '');
		if (value.length > 72) {
			return;
		}
		this.setState({
			nameChars: value.length
		});
		if (value.length >= 72) {
			this.setState({
				nameChars: 72,
				nameLimit: true
			});
		}
		else {
			this.setState({
				nameLimit: false
			})
		}
		this.setFormData('command', value);
	}

    saveHandler = () => {
        const command = this.state.formData;
        command.responseChannel = (command.responseChannel && command.responseChannel.value) || null;
        const url = `/api/server/${this.props.match.params.id}/customcommands/edit`;
        const data = { command };


        if (command.response.length > 10000) return _showError('Respones cannot be over 10,000 characters.');

		const test = command.response.replace(/ *\{[^)]*\} */g, '');
        if (test.length > 2000) return _showError('Response cannot be over 2,000 characters.');

        axios.post(url, data).then((res) => {
            if (res.status === 200) {
                _showSuccess(`Updated Command ${command.command}`);

                this.props.onClose(command);
                this.setState({ formData: this.defaultFormData });
            } else {
                _showError('An error occurred.');
            }
        }).catch((err) => {
            if (err) {
                _showError('Something went wrong.');
            }
        });
	}

	toggleSetting = (type) => {
		const { settingsOpen } = this.state;
		settingsOpen[type] = !settingsOpen[type];
		this.setState({ settingsOpen });
	}

    render() {
		const module = this.props.data.module;
		let channels = this.state.channels.filter(c => c.type === 0);
		let roles = this.state.roles;

		const contentClass = this.state.contentLimit ? "over2k" : "";
		const nameClass = this.state.nameLimit ? "over2k" : "";

		const channelOptions = channels.map(c => ({ value: c.id, label: c.name }));
		const roleOptions = roles.map(r => ({ value: r.id, label: r.name }));

		const allowedChannels = channels.filter(c => c.type === 0 && this.state.formData.allowedChannels.find(i => i.id === c.id));
		const ignoredChannels = channels.filter(c => c.type === 0 && this.state.formData.ignoredChannels.find(i => i.id === c.id));
		const allowedRoles = roles.filter(r => this.state.formData.allowedRoles.find(i => i.id === r.id));
		const ignoredRoles = roles.filter(r => this.state.formData.ignoredRoles.find(i => i.id === r.id));

		const disableName = !!this.props.command;

		return (<div className='settings-content'>
			<div className='cc-add'>
				<h3 className='title is-5'>{this.props.command ? 'Edit' : 'Add'} Command</h3>
				<label className='label'>Command - <span className={nameClass}>{this.state.nameChars}</span> Character{this.state.nameChars == 1 ? '' : 's'}</label>

				<p className='cc-name control has-addons'>
					<label className='label'>{this.state.prefix}</label>
					<input className='input' type='text' value={this.state.formData.command} disabled={disableName} onChange={this.handleCommandName} />
				</p>

				<p className='control'>
					<label className='label'>Response - <span className={contentClass}>{this.state.contentChars}</span> Character{this.state.contentChars == 1 ? '' : 's'} </label>
					<textarea className='input cc-response' name="response" value={this.state.formData.response} onChange={this.handleInput.bind(this, 'response')}></textarea>
				</p>

				<fieldset className='control-group-toggle' onClick={this.toggleSetting.bind(this, 'options')}>
					<legend align='center'>
						{this.state.settingsOpen.options ? 'Hide' : 'Show'} Options
					</legend>
				</fieldset>
				{this.state.settingsOpen.options && (
					<div>
						<div className='cc-input-group is-3'>
							<RichCheckbox
								text='Delete Command'
								onChange={this.handleCheckbox.bind(this, 'delete')}
								helpText='Deletes the command after being used.'
								defaultValue={this.state.formData.delete} />
							<RichCheckbox
								text='Silent Command'
								onChange={this.handleCheckbox.bind(this, 'silent')}
								helpText='The bot will not respond.'
								defaultValue={this.state.formData.silent} />
							<RichCheckbox
								text='DM Response'
								onChange={this.handleCheckbox.bind(this, 'dm')}
								helpText='The response will be sent to the user who used the command.'
								defaultValue={this.state.formData.dm} />
							<RichCheckbox
								text='Disable @everyone'
								onChange={this.handleCheckbox.bind(this, 'noEveryone')}
								helpText='The bot will be unable to mention @everyone in the response.'
								defaultValue={this.state.formData.noEveryone} />
						</div>
					</div>
				)}

				<fieldset className='control-group-toggle' onClick={this.toggleSetting.bind(this, 'permissions')}>
					<legend align='center'>
						{this.state.settingsOpen.permissions ? 'Hide' : 'Show'} Permissions
					</legend>
				</fieldset>
				{this.state.settingsOpen.permissions && (
					<div>
						<div className='cc-input-group'>
							<RichMultiSelect
								module={module}
								setting='allowedRoles'
								friendlyName='Allowed Role'
								label='Allowed Roles'
								placeholder='Allowed Roles'
								defaultValue={allowedRoles}
								options={roleOptions}
								helpText='Only members that have these roles can use the command.'
								onChange={this.handleMultiSelect.bind(this, 'allowedRoles')} />
							<RichMultiSelect
								module={module}
								setting='ignoredRoles'
								friendlyName='Ignored Role'
								label='Ignored Roles'
								placeholder='Ignored Roles'
								defaultValue={ignoredRoles}
								options={roleOptions}
								helpText='Members who have these roles cannot use the command.'
								onChange={this.handleMultiSelect.bind(this, 'ignoredRoles')} />
							<RichMultiSelect
								module={module}
								setting='allowedChannels'
								friendlyName='Allowed Channel'
								label='Allowed Channels'
								placeholder='Allowed Channels'
								defaultValue={allowedChannels}
								options={channelOptions}
								helpText='The command will only work in these channels.'
								onChange={this.handleMultiSelect.bind(this, 'allowedChannels')} />
							<RichMultiSelect
								module={module}
								setting='ignoredChannels'
								friendlyName='Ignored Channel'
								label='Ignored Channels'
								placeholder='Ignored Channels'
								defaultValue={ignoredChannels}
								options={channelOptions}
								helpText='The command will not work in these channels.'
								onChange={this.handleMultiSelect.bind(this, 'ignoredChannels')} />
						</div>
						<div className='cc-input-group'>
							<RichSelect
								text='Response Channel'
								defaultValue={this.state.formData.responseChannel}
								defaultOption='Response Channel'
								options={channelOptions}
								helpText='The channel Dyno will respond in.'
								onChange={this.handleSelect.bind(this, 'responseChannel')} />
						</div>
					</div>
				)}

				<div className='control'>
					<Variables />
				</div>

				<fieldset className='control-group-toggle' onClick={this.toggleSetting.bind(this, 'advVars')}>
					<legend align='center'>
						{this.state.settingsOpen.advVars ? 'Hide' : 'Show'} Advanced Variables
					</legend>
				</fieldset>
				{this.state.settingsOpen.advVars && (
					<AdvancedVariables />
				)}

				{this.props.command ? (
					<div className='cc-buttons'>
						<span className='control'>
							<a className='button edit-command is-info' onClick={this.saveHandler}>Save Command</a>
						</span>
					</div>
				) : (
					<div className='cc-buttons'>
						<span className='control'>
							<a className='button add-command is-info' onClick={this.addHandler}>Add Command</a>
						</span>
					</div>
				)}
			</div>
		</div>);
    }
}

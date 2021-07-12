import React from 'react';
import axios from 'axios';
import Modal from 'react-responsive-modal';
import Help from '../common/Help.jsx';
import { Embed, EmbedBuilder } from '../common/Embed';
import RichCheckbox from '../common/RichCheckbox.jsx';
import RichMultiSelect from '../common/RichMultiSelect.jsx';
import RichSelect from '../common/RichSelect.jsx';
import Variables from '../common/Variables.jsx';
import AdvancedVariables from '../common/AdvancedVariables.jsx';

export default class CommandModal extends React.Component {
	state = {
		customcommands: {},
		channels: [],
		prefix: '?',
		roles: [],
		formData: this.defaultFormData,
		settingsOpen: {
			permissions: false,
			options: true,
			advOptions: false,
			advVars: false,
			responses: false,
		},
		contentChars: 0,
		contentLimit: false,
		nameChars: 0,
		nameLimit: false,
		embedModalOpen: false,
		defaultResponses: true,
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
			cooldown: false,
		};
	}

	get randomId() {
		const fn = () => (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
		return `${fn()}-${fn()}`;
	}

	async componentWillMount() {
		this.setState({
			customcommands: this.props.customcommands || {},
			channels: this.props.channels || [],
			prefix: this.props.prefix || '?',
			roles: this.props.roles || [],
			formData: this.props.command ? this.addCommandData(this.props.command, this.props.channels) : this.defaultFormData,
		});

		const { command } = this.props;
		if (command && this.state.defaultResponses) {
			if (command.responses && command.responses.length) {
				const { settingsOpen } = this.state;
				settingsOpen.responses = true;
				this.setState({ defaultResponses: false, settingsOpen });
			} else {
				this.setState({ defaultResponses: false });
			}
		}
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
		if (command.command) {
			this.setState({ nameChars: command.command ? command.command.length : 0 });
			this.filterContent(command.response)
			return Object.assign({}, this.defaultFormData, command, { responseChannel });
		}
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

	handleCooldown = (event) => {
		let cooldown = this.state.formData.coolown || 0;

		if (event.target.value && isNaN(event.target.value)) {
			return;
		}

		cooldown = parseInt(event.target.value, 10) * 1000;

		if (cooldown > 300000) {
			cooldown = 300000;
		}

		this.setFormData('cooldown', cooldown);
	}

	handleArgs = (event) => {
		let args = this.state.formData.args || 0;

		if (event.target.value && isNaN(event.target.value)) {
			return;
		}

		args = parseInt(event.target.value, 10);

		if (args > 10) {
			args = 10;
		}

		this.setFormData('args', args);
	}

	handleDeleteAfter = (event) => {
		let deleteAfter = this.state.formData.deleteAfter || 0;

		if (event.target.value && isNaN(event.target.value)) {
			return;
		}

		deleteAfter = parseInt(event.target.value, 10);

		if (deleteAfter > 30) {
			deleteAfter = 30;
		}

		this.setFormData('deleteAfter', deleteAfter);
	}

	createResponse = (type) => {
		const { formData } = this.state;
		formData.responses = formData.responses || [];

		if (formData.responses.length >= 25) {
			return;
		}

		formData.responses.push({ id: this.randomId, type });
		this.setState({ formData });
	}

	deleteResponse = (response, event) => {
		const { formData } = this.state;
		console.log(response);

		formData.responses = formData.responses.filter(r => r.id !== response.id);

		this.setState({ formData });
	}

	handleResponse = (response, key, event) => {
		const { formData } = this.state;

		formData.responses = formData.responses || [];

		const index = formData.responses.findIndex(r => r.id === response.id);
		if (index > -1) {
			response[key] = event.target.value;
			formData.responses[index] = response;
		}

		this.setState({ formData });
	}

	handleResponseChannel = (response, props, selectedOption) => {
		const { formData } = this.state;

		formData.responses = formData.responses || [];

		const index = formData.responses.findIndex(r => r.id === response.id);
		if (index > -1) {
			response.channel = selectedOption.value;
			formData.responses[index] = response;
		}

		this.setState({ formData });
	}

	editEmbed = (response, event) => {
		response.embed = response.embed || false;
		this.setState({ activeResponse: response, embedModalOpen: true });
	}

	saveEmbed = (embed) => {
		const { activeResponse, formData } = this.state;
		activeResponse.embed = embed;

		const index = formData.responses.findIndex(r => r.id === activeResponse.id);
		if (index > -1) {
			formData.responses[index] = activeResponse;
		}

		this.setState({ activeResponse: false, embedModalOpen: false, formData });
	}

	closeEmbedModal = () => {
		this.setState({ embedModalOpen: false });
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

		console.log(command);

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
		const { formData } = this.state;

		let channels = this.state.channels.filter(c => (c.type === 0 || c.type === 4));
		let roles = this.state.roles;

		const contentClass = this.state.contentLimit ? "over2k" : "";
		const nameClass = this.state.nameLimit ? "over2k" : "";

		const channelOptions = channels.map(c => ({ value: c.id, label: c.name }));
		const roleOptions = roles.map(r => ({ value: r.id, label: r.name }));

		const allowedChannels = channels.filter(c => formData.allowedChannels.find(i => i.id === c.id));
		const ignoredChannels = channels.filter(c => formData.ignoredChannels.find(i => i.id === c.id));
		const allowedRoles = roles.filter(r => formData.allowedRoles.find(i => i.id === r.id));
		const ignoredRoles = roles.filter(r => formData.ignoredRoles.find(i => i.id === r.id));

		const responseChannelOptions = channelOptions;
		responseChannelOptions.unshift({ value: 'commandChannel', label: '[Current Channel]' });
		responseChannelOptions.unshift({ value: 'userChannel', label: '[DM Current User]' });

		const disableName = !!this.props.command;

		const showIcon = (
			<span className='icon is-link'>
				<i className='fa fa-plus-circle'></i>
			</span>
		);

		const hideIcon = (
			<span className='icon is-link'>
				<i className='fa fa-minus-circle'></i>
			</span>
		);

		const modalClasses = {
            modal: 'embed-modal',
		};

		return (<div className='settings-content'>
			<div className='cc-add'>
				<h3 className='title is-5'>{this.props.command ? 'Edit' : 'Add'} Command</h3>
				<label className='label'>Command - <span className={nameClass}>{this.state.nameChars}</span> Character{this.state.nameChars == 1 ? '' : 's'}</label>

				<p className='cc-name control has-addons'>
					<label className='label'>{this.state.prefix}</label>
					<input className='input' type='text' value={formData.command} disabled={disableName} onChange={this.handleCommandName} />
				</p>

				<p className='control'>
					<label className='label'>Response - <span className={contentClass}>{this.state.contentChars}</span> Character{this.state.contentChars == 1 ? '' : 's'} </label>
					<textarea className='input cc-response' name="response" value={formData.response} onChange={this.handleInput.bind(this, 'response')}></textarea>
				</p>

				<fieldset className='control-group-toggle'>
					<legend onClick={this.toggleSetting.bind(this, 'options')}>
						{this.state.settingsOpen.options ? hideIcon : showIcon} Options
					</legend>
					{this.state.settingsOpen.options && (
						<div>
							<div className='cc-input-group is-3'>
								<RichCheckbox
									text='Delete Command'
									onChange={this.handleCheckbox.bind(this, 'delete')}
									helpText='Deletes the command after being used.'
									defaultValue={formData.delete} />
								<RichCheckbox
									text='Silent Command'
									onChange={this.handleCheckbox.bind(this, 'silent')}
									helpText='The bot will not respond.'
									defaultValue={formData.silent} />
								<RichCheckbox
									text='DM Response'
									onChange={this.handleCheckbox.bind(this, 'dm')}
									helpText='The response will be sent to the user who used the command.'
									defaultValue={formData.dm} />
								<RichCheckbox
									text='Disable @everyone'
									onChange={this.handleCheckbox.bind(this, 'noEveryone')}
									helpText='The bot will be unable to mention @everyone in the response.'
									defaultValue={formData.noEveryone} />
							</div>
						</div>
					)}
				</fieldset>

				<fieldset className='control-group-toggle'>
					<legend onClick={this.toggleSetting.bind(this, 'permissions')}>
						{this.state.settingsOpen.permissions ? hideIcon : showIcon} Permissions (optional)
					</legend>
					{this.state.settingsOpen.permissions && (
						<div>
							<div className='cc-input-group is-2'>
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
								<RichSelect
									text='Response Channel'
									defaultValue={formData.responseChannel}
									defaultOption='Response Channel'
									options={channelOptions}
									helpText='The channel Dyno will respond in.'
									onChange={this.handleSelect.bind(this, 'responseChannel')} />
							</div>
						</div>
					)}
				</fieldset>

				<fieldset className='control-group-toggle'>
					<legend onClick={this.toggleSetting.bind(this, 'advOptions')}>
						{this.state.settingsOpen.advOptions ? hideIcon : showIcon} Advanced Options (optional)
					</legend>
					{this.state.settingsOpen.advOptions && (
						<div>
							<div className='cc-input-group is-3'>
								<div className='control'>
									<label className='label'>Cooldown (seconds) <Help text='The number of seconds a user must wait before running the command again.' /></label>
									<input className='input' type='text' placeholder='2' value={formData.cooldown ? formData.cooldown / 1000 : ''} onChange={this.handleCooldown} />
								</div>
								<div className='control'>
									<label className='label'>Delete After (seconds) <Help text='Dyno will delete the command response after a number of seconds. Max 30 seconds.' /></label>
									<input className='input' type='text' placeholder='10' value={formData.deleteAfter || ''} onChange={this.handleDeleteAfter} />
								</div>
								<div className='control'>
									<label className='label'>Required Arguments <Help text='Set the number of required arguments, if the command is called with fewer than this number, it will not run.' /></label>
									<input className='input' type='text' placeholder='1' value={formData.args || ''} onChange={this.handleArgs} />
								</div>
							</div>
						</div>
					)}
				</fieldset>

				{config.isPremium && this.props.data.isPremium && (
					<fieldset className='control-group-toggle'>
						<legend onClick={this.toggleSetting.bind(this, 'responses')}>
							{this.state.settingsOpen.responses ? hideIcon : showIcon} Additional Responses (optional)
						</legend>
						{this.state.settingsOpen.responses && (
							<div>
								<div className='cc-input-group is-2'>
									{formData.responses && formData.responses.length ? (
											formData.responses.filter(r => r.type === 'message').map(response => (
												<div key={response.id} id={response.id} className='control'>
													<RichSelect
														// text='Channel'
														defaultValue={response.channel ? responseChannelOptions.find(o => o.value === response.channel) : false}
														defaultOption='Select Channel'
														options={responseChannelOptions}
														onChange={this.handleResponseChannel.bind(this, response)} />
													<div className='control'>
														<textarea className='input cc-add-response' placeholder='Response' value={response.value || ''} onChange={this.handleResponse.bind(this, response, 'value')}></textarea>
													</div>
													<a onClick={this.deleteResponse.bind(this, response)}>Remove</a>
												</div>
											))
									) : ''}
								</div>
								<div className='cc-input-group'>
									{formData.responses && formData.responses.length ? (
											formData.responses.filter(r => r.type === 'embed').map(response => (
												<div key={response.id} id={response.id} className='control'>
													<RichSelect
														// text='Channel'
														defaultValue={response.channel ? responseChannelOptions.find(o => o.value === response.channel) : false}
														defaultOption='Select Channel'
														options={responseChannelOptions}
														onChange={this.handleResponseChannel.bind(this, response)} />
													<div className='control'>
														{response.embed && (<Embed embed={response.embed} channels={channels} roles={roles}/>)}
														<button className='button is-info edit-embed-btn' onClick={this.editEmbed.bind(this, response)}>Edit Embed</button>
														{/* <textarea className='input cc-add-response' placeholder='Response' value={response.value || ''} onChange={this.handleResponse.bind(this, response, 'value')}></textarea> */}
													</div>
													<a onClick={this.deleteResponse.bind(this, response)}>Remove</a>
												</div>
											))
									) : ''}
								</div>
								<a className='add-response-link' onClick={this.createResponse.bind(this, 'message')}>
									<span className='icon is-link'>
										<i className='fa fa-plus-circle'></i>
									</span>
									Add Response
								</a>
								<a className='add-response-link' onClick={this.createResponse.bind(this, 'embed')}>
									<span className='icon is-link'>
										<i className='fa fa-plus-circle'></i>
									</span>
									Add Embed Response
								</a>
							</div>
						)}
					</fieldset>
				)}

				<fieldset className='control-group-toggle'>
					<legend onClick={this.toggleSetting.bind(this, 'advVars')}>
						{this.state.settingsOpen.advVars ? hideIcon : showIcon} Variable Reference
					</legend>
					{this.state.settingsOpen.advVars && (
						<div className='control'>
							<Variables />
							<AdvancedVariables />
						</div>
					)}
				</fieldset>

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
			<Modal open={this.state.embedModalOpen} classNames={modalClasses} onClose={this.closeEmbedModal}>
				<EmbedBuilder
					roles={roles}
					channels={channels}
					embed={this.state.activeResponse ? this.state.activeResponse.embed || {} : false}
					isPremium={this.props.data.isPremium}
					deleteButton={false}
					onSave={this.saveEmbed}
					saveText='Save' />
			</Modal>
		</div>);
    }
}

import React from 'react';
import axios from 'axios';
import ModuleSettings from '../../common/ModuleSettings.jsx';
import SettingCheckbox from '../common/SettingCheckbox.jsx';
import RichMultiSelect from '../../common/RichMultiSelect.jsx';
import { updateModuleSetting } from '../service/dashboardService.js';
import { createTag } from './service/tagService.js';
import Loader from '../../common/Loader.jsx';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import TagList from './TagList.jsx'

export default class Tags extends ModuleSettings {
	state = {
		tags: {},
		roles: [],
		allowedRoles: [],
		isLoading: true,
		formData: {
			tag: '',
			content: '',
		},
		contentChars: 0,
		contentLimit: false,
		nameChars: 0,
		nameLimit: false,
	}

	async componentWillMount() {
		try {
			let response = await axios.get(`/api/modules/${this.props.match.params.id}/tags`);

			this.setState({
				tags: response.data.tags || {},
				roles: response.data.roles || [],
				allowedRoles: response.data.tags.allowedRoles || [],
				isLoading: false,
			});
		} catch (e) {
			this.setState({ error: 'Failed to get data, try again later' });
		}
	}

	handleAllowedRoles = (props, selectedOptions) => {
		const allowedRoles = selectedOptions.map(o => ({ id: o.value, name: o.label }));
		updateModuleSetting(props.module, 'allowedRoles', allowedRoles, 'Allowed Roles');
		this.setState({ allowedRoles });
	}

	handleSetting = (props, isEnabled) => {
		let tags = this.state.tags;
		tags[props.setting] = isEnabled;
		this.setState({ tags });
	}

	handleInput = (type, event) => {
		const { formData } = this.state;
		// ^[a-z][a-zA-Z0-9\-\_\+]{1,72}
		const name = event.target.value || '';
		if (type === 'tag') {
			if (name.length > 72) {
				return;
			}
			this.setState({
				nameChars: name.length
			});
			if (name.length >= 72) {
				this.setState({
					nameLimit: true,
					nameChars: 72
				});
			}
			else {
				this.setState({
					nameLimit: false
				})
			}
			if (name.match(/[^a-zA-Z0-9\-_]/)) {
				return;
			}
		}
		var content = event.target.value;
		if (type === 'content') {
			if (content.length > 2000) {
				return;
			}
			this.setState({
				contentChars: content.length
			});
			if (content.length >= 2000) {
				this.setState({
					contentLimit: true,
				});
			}
			else {
				this.setState({
					contentLimit: false
				})
			}
		}
		formData[type] = name;
		this.setState({ formData });
	}

	resetCount() {
		this.setState({
			nameChars: 0,
			nameLimit: false,
			contentChars: 0,
			contentLimit: false
		})
	}

	addTag = () => {
		const { formData } = this.state;
		createTag(formData);
		this.resetCount();
		this.setState({ formData: { tag: '', content: '' } });
	}

	render() {
		if (this.state.isLoading) {
			return <Loader />;
		}
		const nameClass = this.state.nameLimit ? "over2k" : "";
		const contentClass = this.state.contentLimit ? "over2k" : "";

		const module = this.props.data.module;
		const tags = this.state.tags;
		const roles = this.state.roles;

		const allowedRoles = roles.filter(r => this.state.allowedRoles.find(i => i.id === r.id));
		const roleOptions = roles.map(r => ({ value: r.id, label: r.name }));

		return (
			<div id='module-tags' className='module-content module-settings'>
				<h3 className='title is-4'>Tags {this.ModuleToggle}</h3>
				<Tabs selectedTabClassName='is-active' selectedTabPanelClassName='is-active'>
					<div className='has-tabs'>
						<div className='tabs'>
							<TabList>
								<Tab><a className='subtab-control'>Settings</a></Tab>
								<Tab><a className='subtab-control'>Tags list</a></Tab>
							</TabList>
						</div>
					</div>
					<TabPanel>
						<div className='settings-content is-flex'>
							<SettingCheckbox
								module={module}
								setting='limitCreate'
								friendlyName='Mod Only'
								defaultValue={tags.limitCreate || false}
								text='Limit creating tags to Allowed Roles'
								helpText='Only users who have any of the allowed roles are able create tags.'
								onChange={this.handleSetting} />
						</div>
						<div className='settings-group'>
							<div className='settings-content is-half'>
								<h3 className='title is-5'>Create Tag</h3>
								<p className='control'>
									<label className='label'>Tag Name - <span className={nameClass}>{this.state.nameChars}</span> Character{this.state.nameChars == 1 ? '' : 's'}</label>
									<input className='input' type='text' value={this.state.formData.tag} onChange={this.handleInput.bind(this, 'tag')} />
								</p>

								<p className='control'>
									<label className='label'>Tag Content - <span className={contentClass}>{this.state.contentChars}</span> Character{this.state.contentChars == 1 ? '' : 's'}</label>
									<textarea className='input' rows='6' placeholder='' value={this.state.formData.content} onChange={this.handleInput.bind(this, 'content')}></textarea>
								</p>

								<p className='control'>
									<a className='button is-info' onClick={this.addTag}>Add Tag</a>
								</p>
							</div>
							<div className='settings-content is-half'>
								<h3 className='title is-5'>Allowed Roles</h3>
								<p>These roles will be allowed to create tags.</p>
								<RichMultiSelect
									module={module}
									setting='allowedRoles'
									friendlyName='Allowed RoleS'
									text='Allowed Roles'
									defaultValue={allowedRoles}
									defaultOption='Select Role'
									options={roleOptions}
									onChange={this.handleAllowedRoles} />
							</div>
						</div>
					</TabPanel>
					<TabPanel>
						<TagList {...this.props} {...this.state} />
					</TabPanel>
				</Tabs>
			</div>);
	}
}

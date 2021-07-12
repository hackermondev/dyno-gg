import React from 'react';
import axios from 'axios';
import ModuleSettings from '../../common/ModuleSettings.jsx';
import RichCheckbox from '../../common/RichCheckbox.jsx';
import { updateNick, updateSetting } from '../service/dashboardService.js';

export default class Settings extends ModuleSettings {
	state = {
		nick: '',
		server: this.defaultServer,
		announcements: [],
	}

	get defaultServer() {
		return {
			modonly: false,
			prefix: '',
			timezone: '',
		};
	}

	async componentWillMount() {
		try {
			let response = await axios.get('/api/modules/' + server + '/settings');
			this.setState({
				server: response.data.server || this.defaultServer,
				announcements: response.data.announcements || [],
				nick: response.data.nick || '',
			});
		} catch (e) {
			this.setState({ error: 'Failed to get data, try again later' });
		}
	}

	updateServerState(key, value) {
		let server = this.state.server;
		this.state.server[key] = value;
		this.setState({ server });
	}

	setModOnly = (identifier, isEnabled) => {
		this.updateServerState('modonly', isEnabled);
		updateSetting('modonly', isEnabled);
	}

	setPrefix = (event) => {
		event.target.value = event.target.value.replace(/\s/, '');
		this.updateServerState('prefix', event.target.value);
	}

	setNick = (event) => {
		this.setState({ nick: event.target.value });
	}

	setTimezone = (event) => {
		this.updateServerState('timezone', event.target.value);
		updateSetting('timezone', event.target.value);
	}

	updateSetting(key) {
		const value = this.state.server[key];
		updateSetting(key, value);
	}

	updateNick() {
		updateNick(this.state.nick);
	}

	render() {
		const { announcements } = this.state;
		let timezones = config.timezones.map(timezone =>
			(<option key={timezone} value={timezone}>{timezone}</option>));

		return (<div id='settings' className='module-content'>
			<h3 className='title is-4'>Home</h3>
			<div className='settings-group'>
				<div className='settings-content is-half'>
					<h3 className='title is-5'>Bot Settings</h3>
					<RichCheckbox
						text='Make commands moderator only'
						onChange={this.setModOnly}
						defaultValue={this.state.server.modonly ? true : false}
					/>
					<label className='label'>Nickname</label>
					<form className='text-form'>
						<p className='control has-addons'>
							<input
								className='input'
								type='text'
								placeholder='Dyno'
								value={this.state.nick}
								maxLength='32'
								onChange={this.setNick} />
							<a className='button nick is-info' onClick={this.updateNick}>Update</a>
						</p>
					</form>

					<label className='label'>Command Prefix</label>
					<form className='text-form'>
						<p className='control has-addons'>
							<input
								className='input'
								type='text'
								name='prefix'
								value={this.state.server.prefix}
								maxLength='5'
								placeholder='?'
								onChange={this.setPrefix} />
							<a className='button is-info' onClick={this.updateSetting.bind(this, 'prefix')}>Update</a>
						</p>
					</form>

					<label className='label'>Timezone</label>
					<p className='control'>
						<span className='select'>
							<select className='setting-dropdown' name='timezone' value={this.state.server.timezone} onChange={this.setTimezone}>
								<option>Select Timezone</option>
								{timezones}
							</select>
						</span>
					</p>
				</div>
				{announcements && announcements.length > 0 && (
					<div className='settings-content is-half'>
						<h3 className='title is-5'>Announcements</h3>
					</div>
				)}
			</div>
		</div>);
	}
}

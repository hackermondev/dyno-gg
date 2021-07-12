import axios from 'axios';
import moment from 'moment';
import React from 'react';
import Slider from 'rc-slider';
import Help from '../../common/Help.jsx';
import ModuleSettings from '../../common/ModuleSettings.jsx';
import Loader from '../../common/Loader.jsx';
import RichSelect from '../../common/RichSelect.jsx';
import FeatureLocker from '../../common/FeatureLocker.jsx';
import { addSlowmode, deleteSlowmode } from './service/slowmode.js';

export default class Slowmode extends ModuleSettings {
	state = {
		channels: [],
		slowmode: { channels: [] },
		selectedOption: {},
		time: '',
		type: 'channel',
		isLoading: true,
	}

	async componentWillMount() {
		try {
			let response = await axios.get(`/api/modules/${this.props.match.params.id}/slowmode`);

			this.setState({
				channels: response.data.channels || [],
				slowmode: response.data.slowmode || { channels: [] },
				isLoading: false,
			});
		} catch (e) {
			this.setState({ error: 'Failed to get data, try again later' });
		}
	}

	handleChannel = (props, selectedOption) => {
		this.setState({ selectedOption });
	}

	handleTime = (event) => {
		let value = event.target.value;

		value = value.replace(/([\D]+)/g, '');

		const int = parseInt(value);
		if (int > 2880) {
			value = 2880;
		}

		this.setState({ time: value });
	}

	addChannel = async () => {
		let { time, type, selectedOption, slowmode } = this.state;

		time = time || 2;

		const channel = {
			id: selectedOption.value,
			time,
		};

		if (type === 'user') {
			channel.user = true;
		}

		slowmode.channels = slowmode.channels || [];
		slowmode.channels.push(channel);

		try {
			await addSlowmode(channel, selectedOption.label);
			this.setState({ selectedOption: false, time: '', slowmode });
		} catch (err) {
			return;
		}
	}

	async deleteChannel(options, channel) {
		try {
			const { slowmode } = this.state;
			const index = slowmode.channels.findIndex(c => c.id === options.id);
			if (index > -1) {
				slowmode.channels.splice(index, 1);
				await deleteSlowmode(options, channel);
				this.setState({ slowmode });
			}
		} catch (err) {
			return;
		}
	}

	setType = (event) => {
		this.setState({ type: event.target.value });
	}

	render() {
		if (this.state.isLoading) {
			return <Loader />;
		}

		const { slowmode } = this.state;

		const channels = this.state.channels.filter(c => c.type === 0);
		const channelOptions = channels
			.filter(c => !slowmode.channels || !slowmode.channels.find(s => s.id === c.id))
			.map(c => ({ value: c.id, label: c.name }));

		let slowmodes = slowmode.channels || [];
		slowmodes = slowmodes.filter(s => channels.find(c => c.id === s.id));

		return (
			<FeatureLocker isLocked={!this.props.data.isPremium}>
				<div id='module-slowmode' className='module-content module-settings'>
					<h3 className='title is-4'>Slowmode {this.ModuleToggle}</h3>
					<div className='settings-content'>
						<h3 className='title is-5'>About</h3>
						<p>Slowmode will rate limit the number of messages members can send in a channel.</p>
					</div>
					<div className='settings-group'>
						<div className='settings-content is-half'>
							<h3 className='title is-5'>Enable Slowmode</h3>
							<RichSelect
								text='Channel'
								defaultValue={this.state.selectedOption}
								defaultOption='Select Channel'
								options={channelOptions}
								onChange={this.handleChannel} />
							<p className='control'>
								<label htmlFor='time'>Select rate limit (seconds)</label>
								<input className='input' type='text' placeholder='2' value={this.state.time} onChange={this.handleTime} />
							</p>
							<p className='control'>
								<input id='channelType' className='radio'
									type='radio'
									name='type'
									value='channel'
									onChange={this.setType}
									checked={this.state.type === 'channel'} />
								<label htmlFor='channelType'>
									Channel slowmode
							<Help text='Slowmode for everyone in the channel.' />
								</label>
							</p>
							<p className='control'>
								<input id='userType' className='radio'
									type='radio'
									name='type'
									value='user'
									onChange={this.setType}
									checked={this.state.type === 'user'} />
								<label htmlFor='userType'>
									User slowmode
							<Help text='Slowmode for every individual user in the channel.' />
								</label>
							</p>
							<p className='control'>
								<a className='button is-info' onClick={this.addChannel}>Add</a>
							</p>
						</div>
						<div className='settings-content is-half'>
							<h3 className='title is-5'>Slowmode List</h3>
							<table className="table is-striped">
								<thead>
									<tr>
										<th>Channel</th>
										<th>Type</th>
										<th>Rate Limit</th>
										<th></th>
									</tr>
								</thead>
								<tbody>
									{slowmodes.map(options => {
										const channel = this.state.channels.find(c => c.id === options.id);
										return (
											<tr key={channel.id}>
												<td>{channel.name}</td>
												<td>{options.user ? 'User' : 'Channel'}</td>
												<td>{options.time} seconds</td>
												<td><a className='button is-danger' onClick={this.deleteChannel.bind(this, options, channel)}>Remove</a></td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</FeatureLocker>
		);
	}
}

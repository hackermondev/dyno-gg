import axios from 'axios';
import moment from 'moment';
import React from 'react';
import Slider from 'rc-slider';
import ModuleSettings from '../common/ModuleSettings.jsx';
import Loader from '../common/Loader.jsx';
import RichSelect from '../common/RichSelect.jsx';
import FeatureLocker from '../common/FeatureLocker.jsx';
import { addAutopurge, deleteAutopurge } from './service/autopurge.js';
import '!style-loader!css-loader!rc-slider/assets/index.css';

export default class Autopurge extends ModuleSettings {
	state = {
		channels: [],
		purges: [],
		selectedOption: {},
		interval: '',
		isLoading: true,
	}

	componentWillMount() {
		this.updateState();
	}

	async updateState() {
		try {
			let response = await axios.get(`/api/modules/${this.props.match.params.id}/autopurge`);

			this.setState({
				channels: response.data.channels,
				purges: response.data.purges,
				isLoading: false,
			});
		} catch (e) {
			this.setState({ error: 'Failed to get data, try again later' });
		}
	}

	handleChannel = (props, selectedOption) => {
		this.setState({ selectedOption });
	}

	handleInterval = (event) => {
		let value = event.target.value;
		value = value.replace(/([\D]+)/g, '');
		const int = parseInt(value);
		if (int > 10080) {
			value = 10080;
		}
		this.setState({ interval: value });
	}

	addPurge = async () => {
		let { interval, selectedOption } = this.state;

		interval = interval || 8;

		try {
			await addAutopurge({ channel: selectedOption.value, interval }, selectedOption.label);
			await this.setState({ selectedOption: false, interval: '' });
			this.updateState();
		} catch (err) {
			return;
		}
	}

	deletePurge = async (purge, channel) => {
		try {
			const purges = this.state.purges;
			const index = purges.findIndex(p => p._id === purge._id);
			if (index > -1) {
				purges.splice(index, 1);
				await deleteAutopurge(purge, channel);
				this.setState({ purges });
			}
		} catch (err) {
			return;
		}
	}

	render() {
		if (this.state.isLoading) {
			return <Loader />;
		}

		let channels = this.state.channels.filter(c => c.type === 0);
		let channelOptions = channels.map(c => ({ value: c.id, label: c.name }));

		let purges = this.state.purges || [];
		purges = purges.filter(p => channels.find(c => c.id === p.channel));

		channelOptions = channelOptions.filter(c => !purges.find(p => p.channel === c.value));

		return (
			<FeatureLocker isLocked={!this.props.data.isPremium}>
				<div id='module-autopurge' className='module-content module-settings'>
					<h3 className='title is-4'>Auto Purge {this.ModuleToggle}</h3>
					<div className='settings-content'>
						<h3 className='title is-5'>About</h3>
						<p>Auto purge will automatically purge a channel of up to 5,000 messages on a set interval.</p>
					</div>
					<div className='settings-group'>
						<div className='settings-content is-half'>
							<h3 className='title is-5'>Add Auto Purge</h3>
							<RichSelect
								text='Channel'
								defaultValue={this.state.selectedOption}
								defaultOption='Select Channel'
								options={channelOptions}
								onChange={this.handleChannel} />
							<div className='control'>
								<label className='label' htmlFor='interval'>Select purge interval (hours)</label>
								<input className='input' type='text' placeholder='8' value={this.state.interval} onChange={this.handleInterval} />
							</div>
							<div className='control'>
								<a className='button is-info' onClick={this.addPurge}>Add</a>
							</div>
						</div>
						<div className='settings-content is-half'>
							<h3 className='title is-5'>Auto Purge List</h3>
							<table className="table is-striped">
								<thead>
									<tr>
										<th>Channel</th>
										<th>Purge Interval</th>
										<th>Next Purge</th>
										<th></th>
									</tr>
								</thead>
								<tbody>
									{purges.map(purge => {
										const channel = this.state.channels.find(c => c.id === purge.channel);
										return (
											<tr key={purge._id}>
												<td>{channel ? channel.name : 'Deleted Channel'}</td>
												<td>{purge.interval} minutes</td>
												<td>{moment(purge.nextPurge).format('YYYY-MM-DD HH:mm')}</td>
												<td><a className='button is-danger' onClick={this.deletePurge.bind(this, purge, channel || { id: purge.channel })}>Remove</a></td>
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

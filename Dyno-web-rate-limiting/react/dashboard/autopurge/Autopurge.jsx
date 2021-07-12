import axios from 'axios';
import moment from 'moment';
import React from 'react';
import Slider from 'rc-slider';
import ModuleSettings from '../common/ModuleSettings.jsx';
import RichSelect from '../common/RichSelect.jsx';
import RichMultiSelect from '../common/RichMultiSelect.jsx';
import { addAutopurge, deleteAutopurge } from './service/autopurge.js';
import '!style-loader!css-loader!rc-slider/assets/index.css';

export default class Autopurge extends React.Component {
	state = {
		channels: [],
		purges: [],
		roles: [],
		selectedOption: {},
		selectedFilter: {},
		selectedRoles: [],
		hasFilterText: false,
		hasFilterRole: false,
		filter: {},
		interval: '',
		isLoading: true,
	}

	filters = [
		{ filter: 'links', friendlyName: 'Links' },
		{ filter: 'invites', friendlyName: 'Invites' },
		{ filter: 'images', friendlyName: 'Images', helpText: `Deletes messages that contain images.` },
		{ filter: 'notimages', friendlyName: 'Not Images', helpText: `Deletes messages that do not contain an image.` },
		{ filter: 'embeds', friendlyName: 'Embeds' },
		{ filter: 'bots', friendlyName: 'Bots' },
		{ filter: 'humans', friendlyName: 'Humans' },
		{ filter: 'match', friendlyName: 'Includes Text', hasText: true, helpText: `Deletes messages that match the text.` },
		{ filter: 'not', friendlyName: 'Excludes Text', hasText: true, helpText: `Deletes messages that do not match the text.` },
		{ filter: 'startswith', friendlyName: 'Starts With', hasText: true, helpText: `Deletes messages that start with the text.` },
		{ filter: 'endswith', friendlyName: 'Ends With', hasText: true, helpText: `Deletes messages that end with the text.` },
		// { filter: 'hasrole', friendlyName: 'Has Role', hasRole: true, helpText: `Deletes messages from members in the role(s).` },
		// { filter: 'notrole', friendlyName: 'Not Role', hasRole: true, helpText: `Deletes messages from members not in the role(s).` },
	];

	componentWillMount() {
		this.updateState();
	}

	async updateState() {
		try {
			let response = await axios.get(`/api/modules/${this.props.match.params.id}/autopurge`);

			this.setState({
				channels: response.data.channels || [],
				purges: response.data.purges || [],
				roles: response.data.roles || [],
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
		let { interval, filter, selectedOption } = this.state;

		interval = interval || 8;

		try {
			await addAutopurge({ channel: selectedOption.value, interval, filter }, selectedOption.label);
			await this.setState({ selectedOption: false, selectedFilter: false, selectedRoles: [], filter: {}, hasFilterText: false, hasFilterRole: false, interval: '' });
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

	handleFilter = (props, selectedFilter) => {
		if (!selectedFilter) {
			if (this.state.filter) {
				return this.setState({ filter: {}, hasFilterText: false, hasFilterRole: false, selectedRoles: [] });
			}
		}
		let filter = this.filters.find(f => f.filter === selectedFilter.value);
		const hasFilterText = filter.hasText;
		const hasFilterRole = filter.hasRole;

		if (hasFilterText && this.state.hasFilterRole) {
			this.setState({ hasFilterRole: false });
		}

		if (hasFilterRole && this.state.hasFilterText) {
			this.setState({ hasFilterText: false });
		}

		if (!hasFilterText && this.state.hasFilterText) {
			this.setState({ hasFilterText: false });
		}

		if (!hasFilterRole && this.state.hasFilterRole) {
			this.setState({ hasFilterRole: false });
		}

		if (filter) {
			filter = JSON.parse(JSON.stringify(filter));
		}

		this.setState({ filter, hasFilterText, hasFilterRole, selectedFilter });
	}

	handleFilterText = (event) => {
		const filter = this.state.filter;
		filter.text = event.target.value || '';
		this.setState({ filter });
	}

	handleFilterRole = (props, selectedRoles) => {
		selectedRoles = selectedRoles && selectedRoles.map(o => ({ id: o.value, name: o.label }));
		const filter = this.state.filter;
		filter.roles = selectedRoles && selectedRoles.map(r => r.id);
		this.setState({ filter, selectedRoles });
	}

	render() {
		let channels = this.state.channels.filter(c => c.type === 0);
		let channelOptions = channels.map(c => ({ value: c.id, label: c.name }));
		let roleOptions = this.state.roles.map(r => ({ value: r.id, label: r.name }));

		let purges = this.state.purges || [];
		purges = purges.filter(p => channels.find(c => c.id === p.channel));

		channelOptions = channelOptions.filter(c => !purges.find(p => p.channel === c.value));

		const filters = this.filters;
		const filterOptions = filters.map(f => ({ value: f.filter, label: f.friendlyName }));

		return (
			<ModuleSettings {...this.props} name='autopurge' title='Auto Purge' isLoading={this.state.isLoading} featureLocker={true}>
				<div className='settings-panel'>
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
							<RichSelect
								text='Filter (optional)'
								defaultValue={this.state.selectedFilter}
								defaultOption='Select Filter'
								options={filterOptions}
								onChange={this.handleFilter} />
							{this.state.filter.helpText && (
								<p className='help-text'>Note: {this.state.filter.helpText}</p>
							)}
							{this.state.hasFilterText && (
								<div className='control'>
									<label className='label'>{this.state.filter.friendlyName}</label>
									<input className='input' type='text' placeholder='Text' value={this.state.filter.text || ''} onChange={this.handleFilterText} />
								</div>
							)}
							{this.state.hasFilterRole && (
								<RichMultiSelect
									module={module}
									setting='filterRole'
									friendlyName='Select Roles'
									text='Select Roles'
									label='Select Roles'
									defaultValue={this.state.selectedRoles}
									defaultOption='Select Role'
									options={roleOptions}
									onChange={this.handleFilterRole} />
							)}
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
										<th>Filter</th>
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
												<td>{purge.filter && purge.filter.filter}{purge.filter && purge.filter.text ? ` ${purge.filter.text}` : ''}</td>
												<td>{moment(purge.nextPurge).format('YYYY-MM-DD HH:mm')}</td>
												<td><a className='button is-info' onClick={this.deletePurge.bind(this, purge, channel || { id: purge.channel })}>Remove</a></td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</ModuleSettings>
		);
	}
}

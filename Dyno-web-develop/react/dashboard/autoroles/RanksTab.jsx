import React from 'react';
import axios from 'axios';
import AddSelectItem from '../common/AddSelectItem.jsx';
import RemoveItemButton from '../common/RemoveItemButton.jsx';
import SettingCheckbox from '../common/SettingCheckbox.jsx';
import { addModuleItem, removeModuleItem } from '../service/dashboardService.js';

export default class RanksTab extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			ranks: [],
			roles: [],
		};

		this.onAddHandler = this.onAddHandler.bind(this);
		this.onRemoveHandler = this.onRemoveHandler.bind(this);
	}

	async UNSAFE_componentWillMount() {
		try {
			let response = await axios.get(`/api/modules/${this.props.match.params.id}/ranks`);
			this.setState({ ranks: response.data.ranks, roles: response.data.roles, disableMulti: response.data.disableMulti });
		} catch (e) {
			this.setState({ error: 'Failed to get data, try again later' });
		}
	}

	async onAddHandler(event, item) {
		try {
			await addModuleItem(this.props.data.module, 'ranks', item, 'Rank');
		} catch (err) {
			return;
		}

		const ranks = this.state.ranks;
		ranks.push(item);
		this.setState({ ranks });
	}

	async onRemoveHandler(identifier) {
		try {
			await removeModuleItem(this.props.data.module, 'ranks', identifier, 'Rank');
		} catch (err) {
			return;
		}

		const ranks = this.state.ranks;
		const index = ranks.findIndex(r => r.id === identifier);
		if (index !== -1) {
			ranks.splice(index, 1);
			this.setState({ ranks });
		}
	}

	render() {
		const module = this.props.data.module;
		const roles = this.state.roles.filter(r => !this.state.ranks.find(i => i.id === r.id));

		return (<div id='autoroles-settings' className='settings-panel'>
			<div className='settings-group'>
				<div className='settings-content is-half'>
					<h3 className='title is-5'>Add Rank</h3>
					<p>Joinable ranks are roles that members can join using the <code>?rank</code> command.</p>
					<AddSelectItem
						module={module}
						setting='ranks'
						friendlyName='Rank'
						text='Select Role'
						defaultOption='Select Role'
						options={roles}
						onClick={this.onAddHandler} />
				</div>
				<div className='settings-content is-half'>
					<h3 className='title is-5'>Rank Settings</h3>
					<SettingCheckbox
						module={module}
						setting='disableMulti'
						friendlyName='Limit to one rank'
						defaultValue={this.state.disableMulti || false}
						helpText='This will prevent users from joining multiple ranks'
						text='Limit users to one rank' />
				</div>
			</div>
			<div className='settings-content is-full'>
				<h3 className='title is-5'>Rank List</h3>
				<table className="table is-striped">
					<thead>
						<tr>
							<th>Rank</th>
							<th>Members</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{this.state.ranks.map((rank) => {
							let role = this.state.roles.find(i => i.id === rank.id);
							if (!role) {
								role = {
									name: 'Invalid role',
								};
							}
							return (
								<tr key={role.id}>
									<td>{role.name}</td>
									<td>{rank.memberCount || 0}</td>
									<td>
										<RemoveItemButton
											module={module}
											setting='ranks'
											identifier={rank.id}
											friendlyName={`rank ${role.name}`}
											onClick={this.onRemoveHandler} />
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>);
	}
}

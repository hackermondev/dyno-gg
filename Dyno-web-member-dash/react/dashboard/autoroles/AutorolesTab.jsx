import React from 'react';
import axios from 'axios';
import Select from '../../common/Select.jsx';
import RemoveItemButton from '../common/RemoveItemButton.jsx';
import { addAutorole, removeAutorole } from './service/autoroleService.js';

export default class AutorolesTab extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			settings: {
				roleOnJoin: false,
				joinWait: false,
			},
			autoroles: [],
			roles: [],
			disabled: false,
			item: {
				role: false,
				type: 'add',
				wait: '',
			},
			value: false,
		};

		this.onChange = this.onChange.bind(this);
		this.onTypeChange = this.onTypeChange.bind(this);
		this.onWaitChange = this.onWaitChange.bind(this);
		this.onAddHandler = this.onAddHandler.bind(this);
		this.onRemoveHandler = this.onRemoveHandler.bind(this);
	}

	async componentWillMount() {
		try {
			let response = await axios.get(`/api/modules/${this.props.match.params.id}/autoroles`);

			if (response.data.autoroles.roleOnJoin && response.data.autoroles.roleOnJoin !== 'Select Role') {
				response.data.autoroles.autoroles.push({
					type: 'add',
					wait: response.data.autoroles.joinWait || undefined,
					role: response.data.autoroles.roleOnJoin,
					roleOnJoin: true,
				});
			}

			this.setState({
				autoroles: response.data.autoroles.autoroles || [],
				settings: {
					joinWait: response.data.autoroles.joinWait || false,
					roleOnJoin: response.data.autoroles.roleOnJoin || false,
				},
			});
		} catch (e) {
			this.setState({ error: 'Failed to get data, try again later' });
		}
	}

	componentDidMount() {
		this.setState({ roles: this.props.roles || [] });
	}

	componentWillReceiveProps(props) {
		this.setState({ roles: props.roles || [] });
	}

	onChange(event) {
		const option = event.target.selectedOptions[0];
		const item = this.state.item;
		item.role = option.value;
		this.setState({
			value: option.value,
			item: item,
		});
	}

	onTypeChange(event) {
		const item = this.state.item;
		item.type = event.target.value;
		this.setState({ item: item });
	}

	onWaitChange(event) {
		const item = this.state.item;
		item.wait = event.target.value;
		item.wait = item.wait.replace(/([\D]+)/g, '');

		const int = parseInt(item.wait);
		if (int > 14400) {
			item.wait = 14400;
		}
		this.setState({ item: item });
	}

	async onAddHandler() {
		const role = this.state.roles.find(r => r.id === this.state.value);

		if (!this.state.value || this.state.value === 'Select Role') {
			return;
		}

		try {
			await addAutorole(this.state.item, role);
		} catch (err) {
			return;
		}

		const autoroles = this.state.autoroles;
		autoroles.push(this.state.item);
		this.setState({
			autoroles,
			item: {
				role: false,
				type: 'add',
				wait: '',
			},
			value: 'Select Role',
		});
	}

	async onRemoveHandler(autorole) {
		let role = this.state.roles.find(r => r.id === autorole.role);
		if (!role) {
			role = {
				name: 'Invalid role',
			};
		}

		try {
			await removeAutorole(autorole, role);
		} catch (err) {
			return;
		}

		const autoroles = this.state.autoroles;
		const index = autoroles
			.findIndex(r => r.role === autorole.role &&
				r.type === autorole.type &&
				((autorole.wait && r.wait === autorole.wait) || !autorole.wait));

		if (index !== -1) {
			autoroles.splice(index, 1);
			this.setState({ autoroles });
		}
	}

	render() {
		const module = this.props.data.module;
		const roles = this.state.roles;

		return (<div id='autoroles-settings'>
			<div className='settings-group'>
				<div className='settings-content is-half'>
					<h3 className='title is-5'>Add Role</h3>
					<p>Autoroles will be given (or removed) to members when joining the server immediately, or after a period of time.</p>
					<Select
						module={module}
						setting='autoroles'
						friendlyName='Autorole'
						text='Select Role'
						defaultOption='Select Role'
						defaultValue={this.state.value}
						disabled={this.state.disabled}
						options={roles}
						onChange={this.onChange} />

					<p className='help-text standout'>
						Note: The Dyno role must be <strong>higher</strong> than the role it's assigning.
					</p>

					<p className='control'>
						<label className='label' htmlFor='wait'>Delay (minutes)</label>
						<input id='wait' className='input is-expanded' type='text' name='wait' placeholder='10' value={this.state.item.wait} onChange={this.onWaitChange} />
					</p>
					<p className='control'>
						<label className='radio' htmlFor='waitAdd'>
							<input id='waitAdd'
								type='radio'
								className='radio'
								name='type'
								value='add'
								checked={this.state.item.type === 'add'}
								onChange={this.onTypeChange} />
							Add Role
						</label>
						<label className='radio' htmlFor='waitRemove'>
							<input id='waitRemove'
								type='radio'
								className='radio'
								name='type'
								value='remove'
								checked={this.state.item.type === 'remove'}
								onChange={this.onTypeChange} />
							Remove Role
						</label>
					</p>

					<p className='control'>
						<a className='button add-autorole is-info' onClick={this.onAddHandler}>Add</a>
					</p>
				</div>
				<div className='settings-content is-half'>
					<h3 className='title is-5'>Autorole List</h3>
					<table className="table is-striped">
						<thead>
							<tr>
								<th>Role</th>
								<th>Type</th>
								<th>Delay</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{this.state.autoroles.map((autorole, index) => {
								let role = this.state.roles.find(r => r.id === autorole.role);
								if (!role) {
									role = {
										name: 'Invalid role',
									};
								}
								return (
									<tr key={index}>
										<td>{role.name}</td>
										<td>{autorole.type}</td>
										<td>{autorole.wait}</td>
										<td>
											<RemoveItemButton
												module={module}
												setting='autoroles'
												friendlyName='Autorole'
												onClick={() => { this.onRemoveHandler(autorole); }} />
										</td>
									</tr>);
							})}
						</tbody>
					</table>
				</div>
			</div>
		</div>);
	}
}

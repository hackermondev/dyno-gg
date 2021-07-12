import React from 'react';
import Select from './Select.jsx';
import { addModuleItem } from '../service/dashboardService.js';

export default class AddSelectItem extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			value: '',
			item: null,
		};

		this.onClick = this.onClick.bind(this);
		this.onChange = this.onChange.bind(this);
    }

	componentDidMount() {
		if (this.props.value) {
			const option = this.props.options.find(o => o.id === this.props.value);
			this.setState({
				value: this.props.value,
				item: {
					id: option.id,
					name: option.name,
				},
			});
		}
	}

    UNSAFE_componentWillReceiveProps(props) {
		if (props.value === this.state.value) {
			return;
		}
        if (props.value) {
			const option = props.options.find(o => o.id === props.value);
			this.setState({
				value: props.value,
				item: {
					id: option.id,
					name: option.name,
				},
			});
		}
    }

	onChange(event) {
		const option = event.target.selectedOptions[0];
		this.setState({
			value: option.value,
			item: {
				id: option.value,
				name: option.dataset.name,
			},
		});
	}

	async onClick(event) {
		if (this.props.onClick) {
			this.props.onClick(event, this.state.item);
		} else {
			addModuleItem(this.props.module, this.props.setting, this.state.item, this.props.friendlyName);
		}
	}

    render() {
		return (<div>
			{!this.props.hideLabel ? (<label className='label'>{this.props.text}</label>) : ''}
			<p className='control has-addons'>
				<span className={this.props.options.length === 0 ? 'select is-loading' : 'select'}>
					<select className='module-setting-dropdown' value={this.state.value} onChange={this.onChange} disabled={this.props.disabled}>
						<option>{this.props.defaultOption}</option>
						{this.props.options.map(option => (
							<option key={option.id} data-name={option.name} value={option.id}>{option.name}</option>
						))}
					</select>
				</span>
				<input className='button add-module-item is-info' type='button' value='Add' onClick={this.onClick} />
			</p>
		</div>);
	}
}

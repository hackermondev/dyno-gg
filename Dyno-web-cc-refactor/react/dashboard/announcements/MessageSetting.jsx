import React from 'react';
import { updateModuleSetting } from '../service/dashboardService.js';

export default class MessageSetting extends React.Component {
	constructor() {
		super();
		this.state = {
			value: '',
		}

		this.onClick = this.onClick.bind(this);
		this.onChange = this.onChange.bind(this);
    }
    
    componentDidMount() {
        this.setState({ value: this.props.defaultValue });
	}

	componentWillReceiveProps(props) {
		if (props.defaultValue === this.state.value) {
			return;
		}
		this.setState({ value: props.defaultValue });
	}

	onChange(event) {
		if (event.target.value && event.target.value.length > 1990) {
			return;
		}
		this.setState({ value: event.target.value });
	}

	async onClick(event) {
		updateModuleSetting(this.props.module, this.props.setting, this.state.value, this.props.friendlyName);
		this.setState({ value: this.state.value });
		if (this.props.onChange) {
			this.props.onChange(event, this.state.value);
		}
	}

    render() {
		return (
			<div className='module-multitext'>
				<label className='label'>{this.props.text}</label>
				<p className='control'>
					<textarea className='input' placeholder={this.props.placeholder} value={this.state.value} onChange={this.onChange}></textarea>
				</p>
				<input className='button is-info' type='button' value='Update' onClick={this.onClick} />
			</div>
		);
	}
}

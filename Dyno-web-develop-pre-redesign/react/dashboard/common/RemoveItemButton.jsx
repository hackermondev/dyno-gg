import React from 'react';
import { removeModuleItem } from '../service/dashboardService.js';

export default class RemoveModuleItem extends React.Component {
	constructor(props) {
		super(props);
		this.onClick = this.onClick.bind(this);
	}

	async onClick() {
		if (this.props.onClick) {
			this.props.onClick(this.props.identifier);
		} else {
			removeModuleItem(this.props.module, this.props.setting, this.props.identifier, this.props.friendlyName);
		}
	}

	render() {
		return (<a className='button is-danger' onClick={this.onClick}>Remove</a>);
	}
}

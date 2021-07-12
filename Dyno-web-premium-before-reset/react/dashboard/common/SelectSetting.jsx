import React from 'react';
import Select from './Select.jsx';
import { updateModuleSetting } from '../service/dashboardService.js';

export default class SelectSetting extends Select {
	constructor() {
		super();
		this.onChange = this.onChange.bind(this);
    }

	async onChange(event) {
		const option = event.target.selectedOptions[0];
		updateModuleSetting(this.props.module, this.props.setting, event.target.value, this.props.friendlyName, option.dataset.name);
		this.setState({ name: option.dataset.name, value: event.target.value });
		if (this.props.onChange) {
			this.props.onChange(event);
		}
	}
}

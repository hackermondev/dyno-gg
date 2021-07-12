import React from 'react';
import RichCheckbox from './RichCheckbox.jsx';
import { updateModuleSetting } from '../service/dashboardService.js';

export default class SettingCheckbox extends RichCheckbox {
	constructor() {
		super();
		this.onChange = this.onChange.bind(this);
	}

	async onChange() {
		this.setState({ isEnabled: !this.state.isEnabled });
		updateModuleSetting(this.props.module, this.props.setting, !this.state.isEnabled, this.props.friendlyName);
		if (this.props.onChange) {
			this.props.onChange(this.props, !this.state.isEnabled);
		}
	}
}

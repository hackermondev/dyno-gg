import React from 'react';
import RichSelect from '../../common/RichSelect.jsx';
import { updateModuleSetting } from '../service/dashboardService.js';

export default class RichSettingSelect extends RichSelect {
	handleChange = async (selectedOption) => {
		const value = selectedOption && selectedOption.value ? selectedOption.value : false;
		const label = selectedOption && selectedOption.label ? selectedOption.label : false;

		await this.setState({ hasChanged: true, selectedOption: selectedOption || false });

		updateModuleSetting(this.props.module, this.props.setting, value || null, this.props.friendlyName, label || null);

		if (this.props.onChange) {
			this.props.onChange(this.props, selectedOption);
		}
	}
}

import React from 'react';
import ModuleToggle from '../common/ModuleToggle.jsx';

export default class ModuleSettings extends React.Component {
	constructor(props) {
		super(props);

		if (!this.props.data) {
			return;
		}

		const module = this.props.data.module;

		this.ModuleToggle = (
			<ModuleToggle
				identifier={module}
				text={module.friendlyName || module.name}
				onChange={this.props.data.toggleModule}
				disabled={module.isPremium && !this.props.isPremium}
				defaultValue={module.enabled} />
		);
	}
}

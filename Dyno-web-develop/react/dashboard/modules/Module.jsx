import React from 'react';
import RichModuleCheckbox from './RichModuleCheckbox.jsx';

export default class Module extends React.Component {
	onChange(module, enabled) {
		module.enabled = enabled;
		this.props.toggleModule(module, enabled);
	}

    render() {
		let module = this.props.module;

		return (
			<RichModuleCheckbox
				identifier={module}
				text={module.friendlyName || module.name}
				onChange={this.onChange.bind(this)}
				description=''
				disabled={module.isPremium && !this.props.isPremium}
				defaultValue={module.enabled}
				helpText={module.description}
				{...this.props} />
		);
	}
}

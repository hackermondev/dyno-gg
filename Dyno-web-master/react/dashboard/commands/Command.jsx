import React from 'react';
import RichCommandCheckbox from './RichCommandCheckbox.jsx';

export default class Command extends React.Component {
    render() {
		let command = this.props.command;
		command.parent = this.props.parent;
		let description = command.description || command.desc;

		if (command.noedit) {
			description += ' - requires the ' + command.group + ' module.';
		}

		let text = '';

		if (this.props.parent) {
			text += `${this.props.parent.name} `;
		}
		text += command.name;

		return (
			<RichCommandCheckbox
				identifier={command}
				text={text}
				onChange={this.props.onToggle}
				description={description}
				disabled={command.noDisable && command.enabled}
				defaultValue={command.enabled}
				helpText={description}
				{...this.props}
			/>
		);
	}
}

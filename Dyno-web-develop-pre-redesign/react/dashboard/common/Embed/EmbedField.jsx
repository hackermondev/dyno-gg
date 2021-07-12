import React from 'react';

export default class EmbedField extends React.Component {
	render() {
		const { field } = this.props;
		if (!field) return null;

		return (
			<div className={'embed-field' + (field.inline ? ' inline' : '')}>
				<div className='embed-field-name'>{field.name}</div>
				<div className='embed-field-value embed-markup' dangerouslySetInnerHTML={{ __html: this.props.formatter(field.value) }}></div>
			</div>
		);
	}
}

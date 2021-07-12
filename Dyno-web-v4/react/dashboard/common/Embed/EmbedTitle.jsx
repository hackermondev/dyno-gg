import React from 'react';

export default class EmbedTitle extends React.Component {
	render() {
		let { title, url } = this.props;
		if (!title) return null;

		const text = (<span className='embed-title-text'>{title}</span>);

		return (
			<div className='embed-title'>
				{url ? (<a href={url} target='_blank'>{text}</a>) : text}
			</div>
		);
	}
}

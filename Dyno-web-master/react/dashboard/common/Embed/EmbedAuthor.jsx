import React from 'react';

export default class EmbedAuthor extends React.Component {
	render() {
		const { author } = this.props;
		if (!author) return null;

		let name = author.name ? (<span className='embed-author-name'>{author.name}</span>) : '';

		return (
			<div className='embed-author'>
				{author.icon_url ? (<img src={this.props.author.icon_url} />) : ''}
				{author.url ? (<a href={author.url} target='_blank'>{name}</a>) : name}
			</div>
		);
	}
}

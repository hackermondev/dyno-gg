import React from 'react';

export default class EmbedFooter extends React.Component {
	render() {
		let { footer, timestamp } = this.props;
		if ((!footer || !footer.text) && !timestamp) return null;

		return (
			<div className='embed-footer'>
				{footer.icon_url && <img className='embed-footer-icon' src={footer.icon_url} />}
				<span>{footer.text}</span>
				{/* footer && timestamp && (<span className='embed-footer-seprator'>•</span>)}
				{timestamp */}
			</div>
		);
	}
}

import React from 'react';

export default class Associate extends React.Component {
	onEdit(associate) {
		this.props.onEdit(associate);
	}

	onDelete(associate) {
		this.props.onDelete(associate);
	}

    render() {
		const { associate } = this.props;

		return (
			<div className={`associate ${!associate.sponsor && 'associate-partner'} ${!associate.id && 'invalid'}`}>
				<div className='associate-name'>
					{associate.name}
					<span className='associate-type'>({associate.sponsor ? 'Sponsor' : 'Partner'})</span>
					<span className='associate-actions is-pulled-right'>
						<a className='associate-icon' onClick={this.onEdit.bind(this, associate)}>
							<span className='icon is-link'>
								<i className='fa fa-edit'></i>
							</span>
						</a>
						<a className='associate-icon' onClick={this.onDelete.bind(this, associate)}>
							<span className='icon is-link'>
								<i className='fa fa-trash'></i>
							</span>
						</a>
					</span>
				</div>
				<div className='associate-desc'>
					{associate.description}
				</div>
				<div className='associate-links'>
					<ul>
						{associate.links && associate.links.map((l, i) => (
							<li key={i}>
								<a href={l.value} target='_blank'>{l.name}</a>
							</li>
						))}
					</ul>
				</div>
				<div className='associate-banner'>
					<img src={associate.banner} />
				</div>
			</div>
		);
	}
}

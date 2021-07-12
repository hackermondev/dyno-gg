import React from 'react';
import ListItem from './ListItem.jsx';

export default class List extends React.Component {
	handleRemove = (item) => {
		if (this.props.onRemove) {
			this.props.onRemove(item, this.props);
		}
	}

	render() {
		return (
			<ul className='filter-list-items'>
				{this.props.items.map(item => (<ListItem key={item.value} item={item} removable={this.props.removable} onRemove={this.handleRemove} />))}
			</ul>
		);
	}
}

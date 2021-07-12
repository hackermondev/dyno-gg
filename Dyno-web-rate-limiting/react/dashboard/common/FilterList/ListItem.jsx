import React from 'react'

export default class ListItem extends React.Component {
	state = {
		item: {},
	}

	componentWillMount() {
		this.setState({ item: this.props.item });
	}

	componentWillReceiveProps(props) {
		this.setState({ item: props.item });
	}

	handleRemove = () => {
		this.props.onRemove(this.state.item);
	}

	render() {
		const { item } = this.props;
		return (
			<li className='filter-list-item' key={item.value}>
				{item.value}
				{this.props.removable ? <a className='button is-info list-item-remove' onClick={this.handleRemove}>Remove</a> : ''}
			</li>
		);
	}
}

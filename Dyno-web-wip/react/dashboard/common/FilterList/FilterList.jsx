import React from 'react';
import List from './List.jsx';
import { Creatable } from 'react-select';
import '!style-loader!css-loader!react-select/dist/react-select.css';
import '!style-loader!css-loader!../../styles/selector.css';
import '!style-loader!css-loader!./styles/list.css';

export default class FilterList extends React.Component {
	state = {
		initialItems: [],
		items: [],
		selectedOptions: [],
		search: null,
	}

	componentWillMount() {
		this.setState({
			initialItems: this.props.initialItems || [],
			items: this.props.initialItems || [],
		});
	}

	componentWillReceiveProps(props) {
		this.setState({
			initialItems: props.initialItems || [],
			items: props.initialItems || [],
		});
	}

	search = (query) => {
		let updatedList = this.state.initialItems;
		updatedList = updatedList.filter(item => item.value.toLowerCase().search(query) !== -1);
		return updatedList;
	}

	filterList = (event) => {
		let updatedList = this.search(event.target.value.toLowerCase());
		this.setState({ items: updatedList, search: event.target.value.toLowerCase() });
	}

	handleCreate = (selectedOptions) => {
		selectedOptions = selectedOptions.map(o => ({ value: o.value, label: o.label }));
		this.setState({ selectedOptions });
	}

	createItems = async () => {
		let { initialItems } = this.state;

		if (this.props.onCreate) {
			this.props.onCreate(this.state.selectedOptions);
		}
		initialItems = initialItems.concat(this.state.selectedOptions);
		await this.setState({ selectedOptions: [], initialItems });
		this.updateItems();
	}

	removeItem = async (item) => {
		if (this.props.onRemove) {
			this.props.onRemove(item);
		}

		let { initialItems } = this.state;

		let initialIndex = initialItems.findIndex(i => i.value === item.value);
		if (initialIndex !== -1) {
			initialItems.splice(initialIndex, 1);
			await this.setState({ initialItems });
		}

		this.updateItems();
	}

	updateItems() {
		let items = this.state.initialItems;
		if (this.state.search && this.state.search.length) {
			items = this.search(this.state.search);
		}
		this.setState({ items });
	}

	render() {
		const CreateInput = (
			<div className='rich-select multi-selector filter-selector control'>
				<label className='label'>
					{this.props.label}
					<Creatable
						multi={this.props.multi || true}
						arrowRenderer={null}
						placeholder='Add New'
						clearable={this.props.clearable}
						onChange={this.handleChange}
						createable={true}
						searchable={true}
						noResultsText=''
						value={this.state.selectedOptions}
						onChange={this.handleCreate} />
					<a className='button is-info' onClick={this.createItems}>Save</a>
				</label>
			</div>
		);

		return (
			<div className='filter-list'>
				{CreateInput}
				<input className='filter-list-search' type='text' placeholder='Search' onChange={this.filterList} />
				<List {...this.props}
					items={this.state.items}
					onRemove={this.removeItem} />
			</div>
		);
	}
}

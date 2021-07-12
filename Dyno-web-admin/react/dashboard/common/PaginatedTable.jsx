import React from 'react';

export default class PaginatedTable extends React.Component {
	state = {
		page: 1,
		pageLimit: 10,
		data: {
			headers: [],
			rows: [],
		},
		paginatedData: [],
		searchResults: [],
		isSearching: false,
		searchQuery: '',
	}

	get defaultData() {
		return {
			headers: [],
			rows: [],
		};
	}

	async componentDidMount() {
		const data = this.props.data || this.defaultData;
		const pageLimit = this.props.pageLimit || 10;
		await this.setState({ data, pageLimit });
		this.paginateData();
	}

	async componentWillReceiveProps(props) {
		const data = props.data || this.defaultData;
		const pageLimit = props.pageLimit || 10;
		await this.setState({ data, pageLimit });

		// search will update the table even if there's no search query in progress
		this.search(this.state.searchQuery, true);
	}

	paginateData() {
		let { data, page, pageLimit, isSearching, searchResults } = this.state;

		if (isSearching) {
			data = searchResults;
		} else {
			data = data.rows;
		}

		const index = (page - 1) * pageLimit;
		const paginatedData = data.slice(index, index + pageLimit);
		this.setState({ paginatedData });
	}

	async setPage(page) {
		await this.setState({ page });
		this.paginateData();
	}

	range(start, end) {
		return [...Array(1 + end - start).keys()].map(v => start + v);
	}

	search(query, preservePage = false) {
		if (!query) {
			this.setState({
				isSearching: false,
				searchResults: [],
				page: (preservePage) ? this.state.page : 1,
				searchQuery: '',
			});

			setTimeout(() => {
				this.paginateData();
			}, 50);

			return;
		}

		const { data } = this.state;
		const { searchableColumnsIds } = data;

		const results = data.rows.filter((r) =>
			searchableColumnsIds.some((i) => {
				let val = r.fields[i].value;

				// Check inside simple HTML children
				if (typeof val !== 'string') {
					if (val.props && val.props.children && typeof val.props.children === 'string') {
						val = val.props.children;
					} else if (data.valueAccessor) {
						val = data.valueAccessor(val, i);

						if (val === false) {
							return false;
						}
					} else {
						return false;
					}
				}

				if (val.toLowerCase().includes(query.toLowerCase())) return true;

				return false;
			})
		);

		this.setState({
			isSearching: true,
			searchResults: results || [],
			page: (preservePage) ? this.state.page : 1,
			searchQuery: query,
		});

		setTimeout(() => {
			this.paginateData();
		}, 50);
	}

	handleSearch(event) {
		const target = event.target;
		const value = target.value;

		this.search(value);
	}

	buildPagination() {
		let { data, page, pageLimit, isSearching, searchResults } = this.state;

		if (isSearching) {
			data = searchResults;
		} else {
			data = data.rows;
		}

		const pageCount = Math.ceil(data.length / pageLimit);

		if (pageCount < pageLimit) {
			const pages = this.range(1, pageCount);
			return pages.map((p, i) => (
				<li key={`page-${i}`} className={p === page ? 'active' : ''}>
					<a className='page' onClick={this.setPage.bind(this, p)}>{p}</a>
				</li>
			));
		}

		// Places the active page around the middle if possible
		let startPage = page - (pageLimit / 2);
		if (startPage < 0) {
			startPage = 0;
		}

		const pages = [];

		if (page > (pageLimit / 2)) {
			pages.push((
				<li key={`page-1`}>
					<a className='page' onClick={this.setPage.bind(this, 1)}>1</a>
				</li>
			));
			pages.push((<li><a>...</a></li>));
		}


		for (let i = 1; i <= pageLimit; i++) {
			let p = startPage + i;
			if (p > pageCount) {
				break;
			}

			pages.push((
				<li key={`page-${i}`} className={p === page ? 'active' : ''}>
					<a className='page' onClick={this.setPage.bind(this, p)}>{p}</a>
				</li>
			));
		}

		if (page < pageCount - (pageLimit / 2)) {
			pages.push((<li><a>...</a></li>));
			pages.push((
				<li key={`page-${pageCount}`}>
					<a className='page' onClick={this.setPage.bind(this, pageCount)}>{pageCount}</a>
				</li>
			));
		}

		return pages;
	}

	render() {
		const { data, paginatedData } = this.state;

		return (
			<div className='paginatedTable'>
				{this.props.search &&
					<p className="control has-icons-right">
						<input type="text" onChange={this.handleSearch.bind(this)} placeholder="Search..." className="input" />
						<span className="icon is-small is-right">
							<i className="fal fa-search"></i>
						</span>
					</p>
				}
				<table className='table is-striped'>
					<thead>
						<tr>
							{data.headers && data.headers.map((h, i) => (<th key={`head-${i}`}>{h}</th>))}
						</tr>
					</thead>
					<tbody>
						{paginatedData && paginatedData.map((row, i) => (
							<tr key={`row-${i}`}>
								{row.fields && row.fields.map((field, i) => (
									<td className={field.className} key={`field-${i}`}>{field.value}</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
				<nav className='pagination' role='navigation' aria-label='pagination'>
					<ul className='pagination-list'>
						{this.buildPagination()}
					</ul>
				</nav>
			</div>
		);
	}
}

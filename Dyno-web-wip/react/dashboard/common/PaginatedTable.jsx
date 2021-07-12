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
		this.paginateData();
	}

	paginateData() {
		const { data, page, pageLimit } = this.state;
		const index = (page - 1) * pageLimit;
		const paginatedData = data.rows.slice(index, index + pageLimit);
		this.setState({ paginatedData });
	}

	async setPage(page) {
		await this.setState({ page });
		this.paginateData();
	}

	range(start, end) {
		return [...Array(1 + end - start).keys()].map(v => start + v);
	}

	buildPagination() {
		const { data, page, pageLimit } = this.state;
		const pageCount = Math.ceil(data.rows.length / pageLimit);

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
		const { data, page, pageLimit, paginatedData } = this.state;

		// const count = data.rows.length;
		// const pageCount = Math.ceil(count / pageLimit);
		// const pages = this.range(1, pageCount);

		return (
			<div className='paginatedTable'>
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
									<td key={`field-${i}`}>{field.value}</td>
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

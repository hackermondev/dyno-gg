import React from 'react';
import axios from 'axios';

export default class Bans extends React.Component {
	state = {
		bans: [],
		pageCount: 0,
		page: 1,
		search: false,
	}

	componentDidMount() {
		this.getPage(1);
	}

	async getPage(page, search) {
		try {
			let url = `/api/modules/${this.props.match.params.id}/bans/${page}`;
			if (search) {
				url += `?search=${search}`;
			}
			const response = await axios.get(url);
			this.setState({ bans: response.data.bans || [], page, pageCount: response.data.pages || 1 });
		} catch (err) {
			this.setState({ error: 'Failed to get data, try again later' });
		}
	}

	handleSearch = (event) => {
		const target = event.target;
		const value = target.value;

		this.setState({ searchValue: value });
	}

	search = () => {
		this.setState({ search: this.state.searchValue || false });
		this.getPage(1, this.state.searchValue);
	}

	range(start, end) {
		return [...Array(1 + end - start).keys()].map(v => start + v);
	}

	buildPagination() {
		let { page, pageCount, search } = this.state;

		const pageLimit = 10;

		if (pageCount < pageLimit) {
			const pages = this.range(1, pageCount);
			return pages.map((p, i) => (
				<li key={`page-${i}`} className={p === page ? 'active' : ''}>
					<a className='page' onClick={this.getPage.bind(this, p, search)}>{p}</a>
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
					<a className='page' onClick={this.getPage.bind(this, 1, search)}>1</a>
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
					<a className='page' onClick={this.getPage.bind(this, p, search)}>{p}</a>
				</li>
			));
		}

		if (page < pageCount - (pageLimit / 2)) {
			pages.push((<li><a>...</a></li>));
			pages.push((
				<li key={`page-${pageCount}`}>
					<a className='page' onClick={this.getPage.bind(this, pageCount, search)}>{pageCount}</a>
				</li>
			));
		}

		return pages;
	}

	handleKeyDown = (e) => {
		if (e.key === 'Enter') {
			this.search();
		}
	}

	render() {
		const { bans } = this.state;

		return (<div id='module-automessage' className='module-content module-settings'>
			<h3 className='title is-4'>Bans</h3>
			<div className='settings-panel'>
				<div className='settings-content'>
					<p className="control has-icons-right">
						<input type="text" onChange={this.handleSearch} onKeyDown={this.handleKeyDown} placeholder="Search..." className="input" />
						<span className="icon is-small is-right">
							<i className="fal fa-search"></i>
						</span>
					</p>
					<div className='bans'>
						{bans && bans.map(ban => (
							<div key={ban.user.id} className='ban'>
								<div className="media">
									<div className="media-left">
										<figure className="image is-48x48">
											{ban.user.avatar ? (
												<img src={`https://cdn.discordapp.com/avatars/${ban.user.id}/${ban.user.avatar}.png?size=128`} alt="Banned user avatar" />
											) : (
												<img className="image navbar-avatar" src="https://discordapp.com/assets/6debd47ed13483642cf09e832ed0bc1b.png" alt="Banned user avatar" />
											)}
										</figure>
									</div>
									<div className="media-content">
										<p className="title is-5">{ban.user.username}#{ban.user.discriminator}</p>
										<p className="subtitle is-6">{ban.user.id}</p>
										{ban.reason && (
											<p className='reason'>{decodeURIComponent(ban.reason)}</p>
										)}
									</div>
								</div>
							</div>
						))}
					</div>
					<nav className='pagination' role='navigation' aria-label='pagination'>
						<ul className='pagination-list'>
							{this.buildPagination()}
						</ul>
					</nav>
				</div>
			</div>
		</div>)
	}
}
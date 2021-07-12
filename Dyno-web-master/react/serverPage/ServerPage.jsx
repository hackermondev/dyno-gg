import React from 'react';
import axios from 'axios';
import TopAd from '../common/TopAd.jsx';

export default class ServerPage extends React.Component {
	state = {
		server: false,
	}

	async componentDidMount() {
		try {
			const response = await axios.get(`/serverlisting/server/${this.props.match.params.id}`);
			this.setState({ server: response.data });
		} catch (err) {
			this.setState({ error: 'Something went wrong.' });
		}
	}

	render() {
		const server = this.state.server;
		let links = '';

		if (server && server.links) {
			links = server.links.map((l, i) => {
				if (l.type === 'youtube') {
					return (<a href={l.url} title="Youtube" key={i} className='server-link' target="_blank">
						<span className="media-icon youtube" style={{ fontFamily: '"Font Awesome 5 Brands"', color: 'white' }}></span>
						{l.url}
					</a>);
				} else if (l.type === 'twitter') {
					return (<a href={l.url} title="Twitter" key={i} className='server-link' target="_blank">
						<span className="media-icon twitter" style={{ fontFamily: '"Font Awesome 5 Brands"', color: 'white' }}></span>
						{l.url}
					</a>);
				} else if (l.type === 'twitch') {
					return (<a href={l.url} title="Twitch" key={i} className='server-link' target="_blank">
						<span className="media-icon twitch" style={{ fontFamily: '"Font Awesome 5 Brands"', color: 'white' }}></span>
						{l.url}
					</a>);
				} else if (l.type === 'reddit') {
					return (<a href={l.url} title="Reddit" key={i} className='server-link' target="_blank">
						<span className="media-icon reddit" style={{ fontFamily: '"Font Awesome 5 Brands"', color: 'white' }}></span>
						{l.url}
					</a>);
				}
				return false;
			});
		}

		return (<div className="page-account">
			<TopAd />
			<div className="hero hero-small">
				<div className="container user">
					<div className="user-avatar" href="/">
						<img alt="Discord server icon" className='image is-128x128' src={server.icon} />
					</div>

					<div className="user-details">
						<h3 className="user-name title is-3" href="/">{server.name}</h3>
						<h5 className="subtitle is-5">{server.memberCount} members</h5>
						<a className='button is-info is-rounded' href={`/server/${server.id}/invite`} title={`Join ${server.name && server.name.length <= 24 ? server.name : 'Server'}`} target='_blank'>
							Join {server.name && server.name.length <= 24 ? server.name : 'Server'}
						</a>
					</div>
				</div>
				{server.categories && (
					<div className='container user'>
						<div className="categories">
							<i className="fal fa-tags" />
							<ul>
								{server.categories.map(cat => (
									<li key={cat} className='cat'>{cat}</li>
								))}
							</ul>
						</div>
					</div>
				)}
			</div>
			<div className="account-content">
				<p className='description'>{server.description}</p>
				{links}
			</div>
		</div>);
	}
}

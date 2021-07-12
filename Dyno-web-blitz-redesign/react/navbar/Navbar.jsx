import axios from 'axios';
import React from 'react';
import Select from 'react-select';
import '!style-loader!css-loader!react-select/dist/react-select.css';
// import '!style-loader!css-loader!../styles/selector.css';
import '!style-loader!css-loader!./styles/select.css';

export default class Navbar extends React.Component {
	state = {
		selectedOption: false,
		isMenuOpen: false,
		isAuthOpen: false,
	};

	handleSelect(selectedOption) {
		if (!selectedOption || !selectedOption.value) {
			return;
		}

		window.location.href = '/manage/' + selectedOption.value;
	}

	onMenuClick() {
		this.setState({ isMenuOpen: !this.state.isMenuOpen });
	}

	onAuthClick() {
		this.setState({ isAuthOpen: !this.state.isAuthOpen });
	}

	render() {
		let options = false;
		if (typeof guilds != 'undefined') {
			options = guilds.map(g => ({ value: g.id, label: g.name }));
		}

		const Auth = typeof user != 'undefined' ? (
			<div className="navbar-end is-hidden-touch">
				<div className="navbar-item">
					<div className="buttons">
						<a className="level-item button is-light" href="/invite" title="Add Dyno to your server"><strong>Add To Server</strong></a>
						<a className="level-item button is-info" href="/account" title="Logout">Manage servers</a>
					</div>
				</div>


				<a className="navbar-item" href="/account">
					{user.avatar ? (
						<img className="image navbar-avatar" src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.jpg`} />
					) : (
							<img className="image navbar-avatar" src="https://discordapp.com/assets/6debd47ed13483642cf09e832ed0bc1b.png" />
						)}
				</a>
				<a className="navbar-item" href="/account">{user.username}</a>
				<div className="navbar-item">
					<div className="buttons">
						<a className="button is-danger is-outlined" href="/logout" title="Logout"><i className="far fa-sign-out"></i></a>
					</div>
				</div>
			</div>
		) : (
				<div className="navbar-item">
					<div className="buttons">
						<a className="level-item button is-light" href="/invite" title="Add Dyno to your server"><strong>Add To Server</strong></a>
						<a className="level-item button is-info" href="/auth" title="Login with Discord">Login with Discord</a>
					</div>
				</div>
			);

		const mobileStyle = { display: (this.state.isAuthOpen ? 'inherit' : 'none') };
		const AuthMobile = typeof user != 'undefined' ? (
			<div className="navbar-item">
				<a className="navbar-item" href="/account">
				{user.avatar ? (
					<img className="image navbar-avatar" src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.jpg`} />
				) : (
						<img className="image navbar-avatar" src="https://discordapp.com/assets/6debd47ed13483642cf09e832ed0bc1b.png" />
					)}
				</a>

				<div className="navbar-mobile-auth" style={mobileStyle}>
					<div className="buttons">
						<a className="level-item button is-light" href="/invite" title="Add Dyno to your server"><strong>Add To Server</strong></a>
						<a className="level-item button is-info" href="/account" title="Logout">Manage servers</a>
					</div>

					<a className="navbar-item" href="/account">{user.username}</a>
					<div className="navbar-item">
						<div className="buttons">
							<a className="button is-danger is-outlined" href="/logout" title="Logout"><i className="far fa-sign-out"></i></a>
						</div>
					</div>
				</div>
			</div>
			) : (
					<div className="navbar-item">
						<div className="buttons">
							{/* <a className="level-item button is-light" href="/invite" title="Add Dyno to your server"><strong>Add To Server</strong></a> */}
							<a className="level-item button is-info is-hidden-tablet" href="/auth" title="Login with Discord">Login</a>
							<a className="level-item button is-info is-hidden-mobile" href="/auth" title="Login with Discord">Login with Discord</a>
						</div>
					</div>
				);


		const navbarMenuStyle = (this.state.isMenuOpen) ? { display: 'block' } : {};
		return (
			<nav className="navbar" role="navigation" aria-label="main navigation">
				<div className="navbar-brand columns is-vcentered">
					<div className="column navbar-burger-column">
						<a role="button" className="navbar-burger burger" aria-label="menu" aria-expanded="false" onClick={this.onMenuClick.bind(this)}>
							<span aria-hidden="true"></span>
							<span aria-hidden="true"></span>
							<span aria-hidden="true"></span>
						</a>
					</div>
					<div className="column navbar-logo-column">
						<a className="navbar-item" href="/">
							<img className="navbar-logo" src="https://s.dyno.gg/web-assets/logo.png" />
						</a>
					</div>
					<div className="column navbar-auth-column">
						<div className='is-hidden-desktop'>
							{AuthMobile}
						</div>
					</div>
				</div>
				<div className="navbar-menu" style={navbarMenuStyle}>
					<div className="navbar-start">
						<div className="divider"></div>
						<a className="navbar-item" href="/servers" title="Public Servers">Public Servers</a>
						<a className="navbar-item" href="/discord" title="Dyno Discord Server" target="_blank">Join Our Discord</a>
						<a className="navbar-item" href="/commands" title="Commands">Commands</a>
						<a className="navbar-item" href="/faq" title="Frequently Asked Questions">FAQ</a>
						<a className="navbar-item" href="/status" title="Dyno Status">Status</a>
						<div className="navbar-item">
							<div className="buttons">
								<a className="button is-info is-outlined" href="/upgrade" title="Get Premium">
									Get Premium
								</a>
							</div>
						</div>

						{/* <a className="navbar-item" href="/team" title="Dyno Team">Team</a> */}
						{/* <a className="navbar-item" href="https://twitter.com/DynoDiscord" target="_blank">Twitter</a> */}
					</div>
					{Auth}
				</div>
			</nav>
		);
	}
}

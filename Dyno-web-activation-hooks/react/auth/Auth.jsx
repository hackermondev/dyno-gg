import axios from 'axios';
import React from 'react';
import Select from 'react-select';
import '!style-loader!css-loader!react-select/dist/react-select.css';
// import '!style-loader!css-loader!../styles/selector.css';
import '!style-loader!css-loader!./styles/select.css';

export default class Auth extends React.Component {
	state = {
		selectedOption: false,
	};

	handleSelect(selectedOption) {
		if (!selectedOption || !selectedOption.value) {
			return;
		}

		window.location.href = '/manage/' + selectedOption.value;
	}

	render() {
		let options = false;
		if (typeof guilds != 'undefined') {
			options = guilds.map(g => ({ value: g.id, label: g.name }));
		}

		return typeof user != 'undefined' ? (
			<div className="level-right">
				<a className="level-item button is-info" href="/account" title="Logout">Manage servers</a>

				{/* <div className="level-item guild-selector">
					<Select
						id='select-server'
						name='server'
						value={this.state.selectedOption}
						placeholder='Select Server'
						clearable={false}
						onChange={this.handleSelect}
						searchable={true}
						autosize={false}
						options={options} />
				</div> */}
				<a className="level-item" href="/account">
					{user.avatar ? (
						<img className="image is-32x32" src={`https://discordapp.com/api/users/${user.id}/avatars/${user.avatar}.jpg`} />
					) : (
						<img className="image is-32x32" src="https://discordapp.com/assets/6debd47ed13483642cf09e832ed0bc1b.png" />
					)}
				</a>
				<a className="level-item" href="/account">{user.username}</a>
				<a className="level-item button is-danger is-outlined" href="/logout" title="Logout"><i className="far fa-sign-out"></i></a>
			</div>
		) : (
			<div className="level-right">
				<a className="level-item button is-info" href="/auth" title="Login with Discord">Login with Discord</a>
			</div>
		);
	}
}

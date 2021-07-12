import React from 'react';
import { NavLink, Link } from 'react-router-dom';

export default class NavItem extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			enabled: this.props.enabled,
			staticLink: this.props.staticLink || false,
		};
	}

	onClick = () => {
		if (this.props.onClick) {
			this.props.onClick();
		}
	}

	render() {
		let classes = '';
		let icon = '';
		if (this.props.hasOwnProperty('enabled')) {
			classes = this.state.enabled ? 'tab-control enabled' : 'tab-control disabled';
		}

		if (this.props.icon) {
			icon = (<span className="icon is-link">
				<i className={this.props.icon}></i>
			</span>);
		}

		return (<li>
			{!this.state.staticLink &&
				<NavLink exact to={this.props.link} className={classes} onClick={this.onClick} activeClassName='is-active'>
					{icon}
					{this.props.label}
				</NavLink>}
			{this.state.staticLink &&
				<a href={this.props.link} className={classes}>
					{icon}
					{this.props.label}
				</a>}
		</li>);
	}
}

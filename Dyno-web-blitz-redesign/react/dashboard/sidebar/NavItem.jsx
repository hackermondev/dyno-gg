import React from 'react';
import { NavLink, Link } from 'react-router-dom';

export default class NavItem extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			enabled: this.props.enabled,
			icon: this.getIcon(this.props.icon),
			isActive: false,
			staticLink: this.props.staticLink || false,
		};
	}

	onClick = () => {
		if (this.props.onClick) {
			this.props.onClick();
		}
	}

	getIcon(icon, active) {
		return `/images/dash/icons/${icon}${active ? '-active' : ''}.svg`;
	}

	isActive = (match) => {
		if (match) {
			if (this.state.isActive) {
				return;
			} else {
				this.setState({ icon: this.getIcon(this.props.icon, match), isActive: true });
			}
		} else {
			if (this.state.isActive) {
				this.setState({ icon: this.getIcon(this.props.icon, match), isActive: false });
			}
		}
	}

	mouseEnter = () => {
		if (this.state.isActive) {
			return;
		}
		this.setState({ icon: this.getIcon(this.props.icon, true) });
	}

	mouseOut = () => {
		if (this.state.isActive) {
			return;
		}
		this.setState({ icon: this.getIcon(this.props.icon) });
	}

	render() {
		let classes = '';
		let icon = '';
		if (this.props.hasOwnProperty('enabled')) {
			classes = this.state.enabled ? 'tab-control enabled' : 'tab-control disabled';
		}

		if (this.state.isActive) {
			classes += ' is-active';
		}

		if (this.props.icon) {
			icon = (<span className="nav-icon is-link">
				<img src={this.state.icon} />
				{/* <i className={this.props.icon}></i> */}
			</span>);
		}

		return (<li className={this.props.className || ''}>
			{!this.state.staticLink &&
				<NavLink exact to={this.props.link} className={classes} onClick={this.onClick} activeClassName='is-active' isActive={this.isActive}
					onMouseEnter={this.mouseEnter}
					onMouseLeave={this.mouseOut}>
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

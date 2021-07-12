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

		if (this.props.subNav) {
			classes += ' is-subnav';
		}

		if (this.props.icon) {
			icon = (<span className="nav-icon is-link">
				<img src={this.state.icon} />
				{/* <i className={this.props.icon}></i> */}
			</span>);
		}

		const type = this.props.subNav ? 'div' : 'li';
		let children = (!this.state.staticLink) ?
			(<NavLink
				key='root-menu'
				exact={this.props.exact != undefined ? this.props.exact : true}
				to={this.props.link}
				className={classes}
				onClick={this.onClick.bind(this)}
				activeClassName='is-active'
				isActive={this.isActive.bind(this)}
				onMouseEnter={this.mouseEnter.bind(this)}
				onMouseLeave={this.mouseOut.bind(this)}>
				{icon}
				{this.props.label}
			</NavLink>) :
			(<a key='root-menu' href={this.props.link} className={classes}>
				{icon}
				{this.props.label}
			</a>);

		if (this.props.children) {
			children = [children, ...this.props.children];
		}

		let wrapperClasses = this.props.className || '';
		if (this.state.isActive) {
			wrapperClasses += ' active';
		}

		return React.createElement(type, { className: wrapperClasses }, children);
	}
}

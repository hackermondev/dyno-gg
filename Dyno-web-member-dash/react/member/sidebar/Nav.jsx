import React from 'react';
import { Textfit } from 'react-textfit';
import NavItem from './NavItem.jsx';

export default class Nav extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			navExpanded: false,
		};

        this.toggleNavigation = this.toggleNavigation.bind(this);
	}

	componentDidMount() {
		if (!this.props.isPremium) {
			this.renderCarbon();
		}
	}

	renderCarbon() {
		const script = document.createElement('script');

		script.id = '_carbonads_js';
		script.src = '//cdn.carbonads.com/carbon.js?zoneid=1673&serve=C6AILKT&placement=dynobotnet';
		script.async = true;

		document.getElementById('carbon-script').appendChild(script);
	}

    async toggleNavigation() {
        this.setState({ navExpanded: !this.state.navExpanded });
    }

    render() {
		const params = this.props.match.params;
		const server = this.props.server;
		const member = this.props.user;
		let premiumTitle = '';
		let carbon = (<div className='carbon-borderless'>
			<div id='carbon-script' className='carbon-wrapper'></div>
		</div>);

		if (this.props.isPremium) {
			carbon = '';
			premiumTitle = (<div className='menu-label label-premium'>
				<img src='/images/premium-transparent.png' />
				<span>Premium Member</span>
			</div>);
		}

		let memberIcon = member.avatar ? (
			<div className='guild-icon'>
				<a href={`/member/${params.id}`}>
					<img src={`https://discordapp.com/api/users/${member.id}/avatars/${member.avatar}.jpg`} />
				</a>
			</div>
		) : (
			<div className='guild-icon'>
				<a href={`/manage/${params.id}`} data-initials={server.initials}>
				</a>
			</div>
		);

		return (<div className='column nav-sidebar'>
			<aside className='menu'>
				<div className='guild-header'>
					{memberIcon}
					<h3 className='title'>
						<Textfit mode='single' min={14} max={25} forceSingleModeWidth={true}>
							{member.username}
						</Textfit>
					</h3>
					{/* <h4 className='member-count'>{server.memberCount} members</h4> */}
				</div>
                {carbon}
				{premiumTitle}
				<div className='nav-collapse-title'>
					<h2 className='nav-title is-2'>Server Dashboard</h2>
					<a className='button' onClick={this.toggleNavigation}><i className='fa fa-bars'></i></a>
				</div>
				<div className={`nav-collapse ${this.state.navExpanded ? 'expanded' : 'collapsed'}`}>
					<p className='menu-label'>General</p>
					<ul className='menu-list'>
						<NavItem link={`/member/${params.id}`} icon='fas fa-home' label='Home' classes='tab-control' onClick={this.toggleNavigation} />
						<NavItem link={`/member/${params.id}/commands`} icon='far fa-terminal' label='Commands' classes='tab-control' onClick={this.toggleNavigation} />
						<p className='menu-label'>Other</p>
					</ul>
				</div>
			</aside>
		</div>);
    }
}

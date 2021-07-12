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
		let premiumTitle = '';
		let premiumLabel = this.props.isPremium ? 'Upgrade Premium' : 'Get Premium';
		let carbon = (<div className='carbon-borderless'>
			<div id='carbon-script' className='carbon-wrapper'></div>
		</div>);

		if (this.props.isPremium) {
			carbon = '';
			premiumTitle = (<div className='menu-label label-premium'>
				<img src='/images/premium-transparent.png' />
				<span>Premium Server</span>
			</div>);
		}

		let enabledModules = this.props.modules
			.filter(m => m.hasPartial && m.enabled && !m.hide)
			.map(m =>
				<NavItem
					key={m.name}
					link={`/manage/${params.id}/${m.partialId}`}
					icon='fas fa-check-square'
					label={m.friendlyName}
					enabled={m.enabled}
					onClick={this.toggleNavigation} />);

		let disabledModules = this.props.modules
			.filter(m => !m.adminEnabled && m.hasPartial && !m.enabled && !m.hide)
			.map(m =>
				<NavItem
					key={m.name}
					link={`/manage/${params.id}/${m.partialId}`}
					icon='far fa-square'
					label={m.friendlyName}
					enabled={m.enabled}
					onClick={this.toggleNavigation} />);

		let premiumModules = this.props.modules
			.filter(m => !m.adminEnabled && m.hasPartial && m.hide)
			.map(m =>
				<NavItem
					key={m.name}
					link={`/manage/${params.id}/${m.partialId}`}
					icon='fas fa-lock-alt'
					label={m.friendlyName}
					enabled={false}
					onClick={this.toggleNavigation} />);

		let guildIcon = server.iconURL ? (
			<div className='guild-icon'>
				<a href={`/manage/${params.id}`}>
					<img src={server.iconURL} />
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
					{guildIcon}
					<h3 className='title'>
						<Textfit mode='single' min={14} max={25} forceSingleModeWidth={true}>
							{server.name}
						</Textfit>
					</h3>
					<h4 className='member-count'>{server.memberCount} members</h4>
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
						<NavItem link={`/manage/${params.id}`} icon='fas fa-home' label='Home' classes='tab-control' onClick={this.toggleNavigation} />
						<NavItem link={`/manage/${params.id}/modules`} icon='fas fa-cubes' label='Modules' classes='tab-control' onClick={this.toggleNavigation} />
						<NavItem link={`/manage/${params.id}/commands`} icon='far fa-terminal' label='Commands' classes='tab-control' onClick={this.toggleNavigation} />
						<NavItem link={`/manage/${params.id}/music-queue`} icon='fas fa-music' label='Music Queue' classes='queue-control' onClick={this.toggleNavigation} />
						<NavItem link={`/upgrade`} staticLink={true} icon='fas fa-arrow-circle-up' label={premiumLabel} classes='tab-control upgrade' onClick={this.toggleNavigation} />
						<p className='menu-label'>Server Listing</p>
						<NavItem link={`/manage/${params.id}/server-listing`} icon='fas fa-list' label='Server Info' classes='tab-control' onClick={this.toggleNavigation} />
						<p className='menu-label'>Module Settings</p>
						{enabledModules}
						{disabledModules}
						{premiumModules}
						<p className='menu-label'>Other</p>
						<NavItem link={`/manage/${params.id}/logs`} icon='far fa-cogs' label='Logs' classes='tab-control' onClick={this.toggleNavigation} />
						{/* <NavItem link={`/manage/${params.id}/modlogs`} icon='fa fa-cogs' label='Moderator Logs' classes='tab-control' onClick={this.toggleNavigation} />
						<NavItem link={`/manage/${params.id}/commandlogs`} icon='fa fa-cogs' label='Command Logs' classes='tab-control' onClick={this.toggleNavigation} /> */}
						<NavItem link={`/manage/${params.id}/warnings`} icon='far fa-cogs' label='Warnings' classes='tab-control' onClick={this.toggleNavigation} />
					</ul>
				</div>
			</aside>
		</div>);
    }
}

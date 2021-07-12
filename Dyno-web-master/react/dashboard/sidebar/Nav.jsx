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
			// this.renderCarbon();
		}
	}

	renderCarbon() {
		return;
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
		let premiumTitle = this.props.isPremium ? 'Premium' : '';
		let premiumLabel = this.props.isPremium ? 'Upgrade Premium' : 'Get Premium';
		// let carbon = (<div className='carbon-borderless'>
		// 	<div id='carbon-script' className='carbon-wrapper'></div>
		// </div>);

		if (this.props.isPremium) {
			premiumTitle = (<span className='label-premium'>Premium</span>);
		}

		let enabledModules = this.props.modules
			.filter(m => m.hasPartial && m.enabled && !m.hide)
			.map(m =>
				<NavItem
					key={m.name + 'e'}
					className='is-hidden-mobile'
					link={`/manage/${params.id}/modules/${m.partialId}`}
					label={m.friendlyName}
					enabled={m.enabled}
					onClick={this.toggleNavigation}
					exact={false}
					subNav />);

		let disabledModules = this.props.modules
			.filter(m => !m.adminEnabled && m.hasPartial && !m.enabled && !m.hide)
			.map(m =>
				<NavItem
					key={m.name + 'd'}
					className='is-hidden-mobile'
					link={`/manage/${params.id}/modules/${m.partialId}`}
					label={m.friendlyName}
					enabled={m.enabled}
					onClick={this.toggleNavigation}
					exact={false}
					subNav />);

		let premiumModules = this.props.modules
			.filter(m => !m.adminEnabled && m.hasPartial && m.hide)
			.map(m =>
				<NavItem
					key={m.name + 'p'}
					className='is-hidden-mobile'
					link={`/manage/${params.id}/modules/${m.partialId}`}
					label={m.friendlyName}
					enabled={false}
					onClick={this.toggleNavigation}
					exact={false}
					subNav />);

		let modules = [...enabledModules, ...disabledModules, ...premiumModules];
		modules = modules.sort((a, b) => {
			if (a.props.label < b.props.label) { return -1; }
			if (a.props.label > b.props.label) { return 1; }
		});

		let guildIcon = server.iconURL ? (
			<div className='guild-icon-wrapper'>
				<div className='guild-icon'>
					<a href={`/manage/${params.id}`}>
						<img alt="The guild icon" src={server.iconURL} />
					</a>
				</div>
			</div>
		) : (
			<div className='guild-icon-wrapper'>
				<div className='guild-icon'>
					<a href={`/manage/${params.id}`} data-initials={server.initials}>
					</a>
				</div>
			</div>
		);

		return (<div className='column nav-sidebar'>
			<aside className='menu'>
				<div className='guild-header'>
					{guildIcon}
					<h3 className='title'>
						<Textfit mode='single' min={14} max={22} forceSingleModeWidth={true}>
							{server.name}
						</Textfit>
					</h3>
					{premiumTitle}
					<h4 className='member-count'>{server.memberCount} members</h4>
				</div>
                {/* {carbon} */}
				<div className='nav-collapse-title'>
					<h2 className='nav-title is-2'>Server Dashboard</h2>
					<a className='button is-info is-hamburger' onClick={this.toggleNavigation}><i className='fa fa-chevron-down'></i></a>
				</div>
				<div className={`nav-collapse ${this.state.navExpanded ? 'expanded' : 'collapsed'}`}>
					{/* <p className='menu-label'>General</p> */}
					<ul className='menu-list'>
						<NavItem link={`/manage/${params.id}`} icon='dash' label='Dashboard' classes='tab-control' onClick={this.toggleNavigation} />
						<NavItem link={`/manage/${params.id}/server-listing`} icon='server-info' label='Server Listing' className='last' classes='tab-control' onClick={this.toggleNavigation} />
						<NavItem exact={false} link={`/manage/${params.id}/modules`} icon='modules' label='Modules' className='modules-nav' onClick={this.toggleNavigation} children={modules} />
						<NavItem exact={false} link={`/manage/${params.id}/commands`} icon='commands' label='Commands' classes='tab-control' onClick={this.toggleNavigation} />
						{/* <NavItem exact={false} link={`/manage/${params.id}/levels`} icon='commands' label='Levels (New)' classes='tab-control' onClick={this.toggleNavigation} /> */}
						<NavItem exact={false} link={`/manage/${params.id}/modules/customcommands`} icon='commands' label='Custom Commands' classes='tab-control' onClick={this.toggleNavigation} />
						<NavItem link={`/manage/${params.id}/modules/music/queue`} icon='music' label='Music Queue' classes='queue-control' onClick={this.toggleNavigation} />
						<NavItem link={`/upgrade`} staticLink={true} icon='premium' label={premiumLabel} className='last' classes='tab-control upgrade' onClick={this.toggleNavigation} />
						{/* <p className='menu-label'>Server Listing</p> */}
						{/* <p className='menu-label'>Module Settings</p> */}
						{/* {enabledModules} */}
						{/* {disabledModules} */}
						{/* {premiumModules} */}
						{/* <p className='menu-label'>Other</p> */}
						<NavItem link={`/manage/${params.id}/logs`} icon='logs' label='Logs' classes='tab-control' onClick={this.toggleNavigation} />
						{/* <NavItem link={`/manage/${params.id}/modlogs`} icon='fa fa-cogs' label='Moderator Logs' classes='tab-control' onClick={this.toggleNavigation} />
						<NavItem link={`/manage/${params.id}/commandlogs`} icon='fa fa-cogs' label='Command Logs' classes='tab-control' onClick={this.toggleNavigation} /> */}
						<NavItem link={`/manage/${params.id}/warnings`} icon='warnings' label='Warnings' classes='tab-control' onClick={this.toggleNavigation} />
					</ul>
				</div>
			</aside>
		</div>);
    }
}

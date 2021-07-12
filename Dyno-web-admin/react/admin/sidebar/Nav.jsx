import React from 'react';
import NavItem from './NavItem.jsx';

export default class Nav extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			navExpanded: false,
		};

        this.toggleNavigation = this.toggleNavigation.bind(this);
	}

    async toggleNavigation() {
        this.setState({ navExpanded: !this.state.navExpanded });
    }

    render() {
        const params = this.props.match.params;
        const title = 'Dyno HQ';

		return (<div className='column nav-sidebar'>
			<aside className='menu'>
				<div className='guild-header'>
					<h3 className='title'>{title}</h3>
				</div>
				<div className='nav-collapse-title'>
					<h2 className='nav-title is-2'>{title}</h2>
					<a className='button is-info is-hamburger' onClick={this.toggleNavigation}><i className='fa fa-chevron-down'></i></a>
				</div>
				<div className={`nav-collapse ${this.state.navExpanded ? 'expanded' : 'collapsed'}`}>
					<ul className='menu-list'>
                        <NavItem link={`/dhq`} icon='dash' label='Dashboard' classes='tab-control' onClick={this.toggleNavigation} />
						{/* <NavItem link={`/manage/${params.id}`} icon='dash' label='Dashboard' classes='tab-control' onClick={this.toggleNavigation} />
						<NavItem link={`/manage/${params.id}/server-listing`} icon='server-info' label='Server Listing' className='last' classes='tab-control' onClick={this.toggleNavigation} />
						<NavItem exact={false} link={`/manage/${params.id}/modules`} icon='modules' label='Modules' className='modules-nav' onClick={this.toggleNavigation} children={modules} />
						<NavItem exact={false} link={`/manage/${params.id}/commands`} icon='commands' label='Commands' classes='tab-control' onClick={this.toggleNavigation} />
						<NavItem exact={false} link={`/manage/${params.id}/modules/customcommands`} icon='commands' label='Custom Commands' classes='tab-control' onClick={this.toggleNavigation} />
						<NavItem link={`/manage/${params.id}/modules/music/queue`} icon='music' label='Music Queue' classes='queue-control' onClick={this.toggleNavigation} />
						<NavItem link={`/upgrade`} staticLink={true} icon='premium' label={premiumLabel} className='last' classes='tab-control upgrade' onClick={this.toggleNavigation} />
						<NavItem link={`/manage/${params.id}/logs`} icon='logs' label='Logs' classes='tab-control' onClick={this.toggleNavigation} />
						<NavItem link={`/manage/${params.id}/warnings`} icon='warnings' label='Warnings' classes='tab-control' onClick={this.toggleNavigation} /> */}
					</ul>
				</div>
			</aside>
		</div>);
    }
}

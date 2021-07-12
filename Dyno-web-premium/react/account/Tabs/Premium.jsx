/* eslint-disable no-invalid-this */
/* global window */
import React from 'react';
import ActivatedServers from './ActivatedServers.jsx';
import Subscription from './Subscription.jsx';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';


export default class Premium extends React.Component {
	render() {
		return (
			<div>
				<div className='account-header'>
					<h1 className="is-size-2 has-text-weight-semibold">Premium</h1>
					<p className="has-text-grey is-size-5">Your premium plans and activated servers</p>
				</div>
				<Subscription {...this.props} />
				<ActivatedServers {...this.props} />
				{/* <Tabs selectedTabClassName='is-active' selectedTabPanelClassName='is-active'>
					<div className='has-tabs'>
						<div className='tabs'>
							<TabList>
								<Tab><a className='subtab-control is-size-4'>Activated Servers</a></Tab>
								<Tab><a className='subtab-control is-size-4'>Premium Plans</a></Tab>
							</TabList>
						</div>
					</div>
					<TabPanel>
					</TabPanel>
					<TabPanel>
					</TabPanel>
				</Tabs > */}
			</div>
		);
	}
}

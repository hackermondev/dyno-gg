import React from 'react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import AutomodLogs from './AutomodLogs.jsx';
import CommandLogs from './CommandLogs.jsx';
import DashboardLogs from './DashboardLogs.jsx';
import ModLogs from './ModLogs.jsx';

export default class Logs extends React.Component {
	render() {
		return (<div className='module-content'>
			<Tabs selectedTabClassName='is-active' selectedTabPanelClassName='is-active'>
				<div className='has-tabs'>
					<div className='tabs'>
						<TabList>
							<Tab><a className='subtab-control'>Dashboard</a></Tab>
							<Tab><a className='subtab-control'>Moderation</a></Tab>
							<Tab><a className='subtab-control'>Automod</a></Tab>
							<Tab><a className='subtab-control'>Commands</a></Tab>
						</TabList>
					</div>
				</div>
				<TabPanel>
					<DashboardLogs {...this.props} />
				</TabPanel>
				<TabPanel>
					<ModLogs {...this.props} />
				</TabPanel>
				<TabPanel>
					<AutomodLogs {...this.props} />
				</TabPanel>
				<TabPanel>
					<CommandLogs {...this.props} />
				</TabPanel>
			</Tabs>
		</div>);
	}
}

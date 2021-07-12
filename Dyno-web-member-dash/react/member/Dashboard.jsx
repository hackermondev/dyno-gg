import React from 'react';
import { Route, Switch } from 'react-router-dom';
import Nav from './sidebar/Nav.jsx';
import ErrorHandler from '../common/ErrorHandler.jsx';

export default class Dashboard extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			isPremium: config.isPremium,
			modules: config.modules,
			server: config.server,
			user: user,
		};
	}

	getProps(moduleName) {
		const props = {
			isPremium: this.state.isPremium,
			modules: this.state.modules,
			match: this.props.match,
			guildId: this.props.match.params.id,
			server: this.state.server,
			user: this.state.user,
		};
		if (moduleName) {
			props.module = this.getModule(moduleName);
		}
		return props;
	}

	getModule(name) {
		return this.state.modules.find(m => m.name.toLowerCase() === name.toLowerCase());
	}

	render() {
		const path = this.props.match.path;

		return (<div className="columns">
			<Nav {...this.getProps()} />
			<ErrorHandler>
				<div className="column">
					<Switch>
						{/* <Route exact path={path} component={Settings} /> */}
						{/* <Route exact path={path} component={Settings} />
						<Route path={`${path}/associates`} render={(props) => (
							<Associates {...props} data={this.getProps('Associates')} />
						)} />
						<Route path={`${path}/logs`} component={Logs} /> */}
						{/* <Route path={`${path}/weblogs`} component={DashboardLogs} />
					<Route path={`${path}/modlogs`} component={ModLogs} />
					<Route path={`${path}/commandlogs`} component={CommandLogs} /> */}
						{/* <Route path={`${path}/warnings`} component={Warnings} /> */}
					</Switch>
				</div>
			</ErrorHandler>
		</div>);
	}
}

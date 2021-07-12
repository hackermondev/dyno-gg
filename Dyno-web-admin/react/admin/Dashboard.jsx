import React from 'react';
import { Route, Switch } from 'react-router-dom';
import Nav from './sidebar/Nav.jsx';
import Home from './pages/Home.jsx';
import Team from './pages/team/Team.jsx';

export default class Dashboard extends React.Component {
    render() {
		const path = this.props.match.path;

		return (<div className="columns">
			<Nav {...this.getProps()} />
            <div className="column">
                <Switch>
                    <Route exact path={path} component={Home} />
                    <Route exact path={`${path}/team`} component={Team} />
                </Switch>
            </div>
        </div>);
    }
}
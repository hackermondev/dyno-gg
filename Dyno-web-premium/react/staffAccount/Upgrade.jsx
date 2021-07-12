import React from 'react';
import Premium from './Upgrade/Premium.jsx';

import {
	Route,
	NavLink,
	Switch,
} from 'react-router-dom';

export default class Upgrade extends React.Component {
  render() {
    const path = this.props.match.path;
    return (
    <div>
      <div className="hero hero-small">
        <div className="hero-content">
          <h1 className="title">Dyno Plans</h1>
          <p className="has-text-grey is-size-6">Upgrading to Dyno Premium or purchasing server listings help support the development and operation of Dyno, as well as providing you with a higher level of service and features.</p>
          <div className='plan-switcher'>
            <NavLink className='premium' activeClassName='active' exact to={`${path}`}><div className='inner-text'>Premium</div></NavLink>
            <NavLink className='listing' activeClassName='active' to={`${path}/listing`}><div className='inner-text'>Listing</div></NavLink>
          </div>
        </div>
      </div>
      <Switch>
        <Route exact path={path} render={() =>
          <Premium />
        } />
        <Route path={`${path}/listing`} render={() =>
          <Premium />
        } />
        {/* <Route path={`${path}/listing`} render={() =>
          <Listing {...this.state} getData={this.getData.bind(this)} />
        } /> */}
      </Switch>
    </div>
    );
  }
}

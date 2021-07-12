import React from 'react';
import {connect} from 'react-redux';
import {Route, Redirect, withRouter} from 'react-router-dom';

const TestPrivateRoute = ({component: Component, ...rest}) => {
	<Route
		{...rest}
		render = {props =>
			props.authenticated ? (
				<Component {...props} />
			) : (
				<Redirect to = {{pathname: '/login',
					state: {from: props.location}
				}} />
			)
		}
	/>;
};

const PrivateRoute = withRouter(connect(null, null)(TestPrivateRoute));
export default PrivateRoute;

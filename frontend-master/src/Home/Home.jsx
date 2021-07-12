import React from 'react';
import {BrowserRouter as Router, Route, withRouter, Redirect} from 'react-router-dom';
import {connect} from 'react-redux';
import About from '../About/About';
import Login from '../Login/Login';

class Home extends React.Component {
	render() {
		const testP = () => {
			return (
				<div>
					<p>Home page</p>
				</div>
			);
		};
		const fakeUser = {authenticated: true};
		const testPrivate = () => <h3>Protected</h3>;
		const PrivateRoute = ({component: Component, ...rest}) => (
			<Route
				{...rest}
				render={props =>
					fakeUser.authenticated ? (
						<Component {...props} />
					) : (
						<Redirect
							to={{
								pathname: '/login',
								state: {from: props.location}
							}}
						/>
					)
				}
			/>
		);
		return (
			<div>
				<div>
					<Route path="/" exact component={testP}/>
					<Route path="/about" component={About}/>
					<Route path="/login" component={Login}/>
					<PrivateRoute path="/private" component={testPrivate}/>
				</div>
			</div>
		);
	}
}

const ConnectedHome = withRouter(connect(null, null)(Home));
export default ConnectedHome;

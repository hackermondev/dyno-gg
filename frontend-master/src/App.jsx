import React, {Component} from 'react';
import './App.css';
import {applyMiddleware, createStore} from 'redux';
import reduxThunk from 'redux-thunk';
import {BrowserRouter as Router, Route, Switch} from 'react-router-dom';
import {Provider} from 'react-redux';
import appReducer from './appReducer';
import Home from './Home/Home';
import About from './About/About';

const store = createStore(appReducer, window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__(), applyMiddleware(reduxThunk));

// This component is for bootstrapping stuff, setting up some basic routes, wrappers, redux, etc.
class App extends Component {
	render() {
		return (
			<div className="App">
				<Provider store={store}>
					<Router>
						<Route path="/" component={Home}/>
					</Router>
				</Provider>
			</div>
		);
	}
}

export default App;

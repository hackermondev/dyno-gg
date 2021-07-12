import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Route } from 'react-router-dom';
import Dashboard from './Dashboard.jsx';

ReactDOM.render((
    <BrowserRouter>
        <Route path='/dhq' component={Dashboard} />
    </BrowserRouter>
), document.getElementById('dashboard-mount'));

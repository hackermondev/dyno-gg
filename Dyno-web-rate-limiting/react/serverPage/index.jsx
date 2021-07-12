import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Route } from 'react-router-dom';
import ServerPage from './ServerPage.jsx';

// ReactDOM.render(
// 	<ServerPage />,
// 	document.getElementById('server-mount'),
// );

ReactDOM.render((
    <BrowserRouter>
        <Route path='/server/:id' component={ServerPage} />
    </BrowserRouter>
), document.getElementById('server-mount'));

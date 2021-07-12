import React from 'react';
import ReactDOM from 'react-dom';
import Config from './Config.jsx';
import {
  BrowserRouter,
  Route,
} from 'react-router-dom';

if (document.getElementById('config-mount') !== null) {
  ReactDOM.render(
    <BrowserRouter>
      <Route path='/support/c/:id' component={Config} />
    </BrowserRouter>,
    document.getElementById('config-mount'),
  );
}

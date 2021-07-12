import React from 'react';
import ReactDOM from 'react-dom';
import Account from './Account.jsx';
import Upgrade from './Upgrade.jsx';
import {
  BrowserRouter,
  Route,
} from 'react-router-dom';

if (document.getElementById('account-mount') !== null) {
  ReactDOM.render(
    <BrowserRouter>
      <Route path='/account' component={Account} />
    </BrowserRouter>,
    document.getElementById('account-mount'),
  );
}
if (document.getElementById('upgrade-mount') !== null) {
  ReactDOM.render(
    <BrowserRouter>
      <Route path='/upgrade' component={Upgrade} />
    </BrowserRouter>,
    document.getElementById('upgrade-mount'),
  );
}

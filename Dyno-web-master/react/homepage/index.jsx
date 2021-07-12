import React from 'react';
import ReactDOM from 'react-dom';
import Serverlist from './../serverListing/Serverlist.jsx';

ReactDOM.render(
    <Serverlist isMainPage={true} />,
    document.getElementById('home-listing-mount'),
);

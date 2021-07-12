import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Route } from 'react-router-dom';
import Dashboard from './Dashboard.jsx';
import { ReactTableDefaults } from 'react-table';
import Loader from './common/Loader.jsx';

Object.assign(ReactTableDefaults, {
    LoadingComponent: ({ className, loading, loadingText }) => {
        let classNames = '-loading';
        if (loading) {
            classNames += ' -active';
        }

        if (className) {
            classNames += ` ${className}`;
        }
        return (
            <div
                className={classNames}
                // {...rest}
            >
                <Loader />
            </div>
        );
    },
});

ReactDOM.render((
    <BrowserRouter>
        <Route path='/manage/:id' component={Dashboard} />
    </BrowserRouter>
), document.getElementById('dashboard-mount'));

import React from 'react';

export default class Listing extends React.Component {
    constructor(props) {
        super();
        this.state = {};
    }


    render() {
        return (
            <div className={'columns'}>
                <div className={'column'}>
                    <div className={'subscription'}>
                        <div className={'subscription-title'}>
                            <h5 className={'title is-5'}>Server Listings</h5>
                            <a className={'button is-info'}>Add Subscription</a>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
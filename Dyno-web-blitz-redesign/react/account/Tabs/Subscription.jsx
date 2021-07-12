/* eslint-disable no-invalid-this */
/* global window */
import React from 'react';
import axios from 'axios';
import moment from 'moment-timezone';
import Modal from 'react-responsive-modal';
import RichSelect from '../../dashboard/common/RichSelect.jsx';

export default class Subscription extends React.Component {
    render() {
        let { userData } = this.props;
        if (userData === null) {
            return (<div className={'container'}><p>Please wait...</p></div>);
        }

        let dynoPremiumSubscriptions = userData ? userData.subscriptions.filter(subscription => subscription.planId.startsWith('premium-')) : [];
        let dynoPremiumServers = 0;
        if (dynoPremiumSubscriptions.length) {
            dynoPremiumSubscriptions = dynoPremiumSubscriptions.map(s => { s.canCancel = true; return s; });
            dynoPremiumServers = dynoPremiumSubscriptions.map(i => i.qty).reduce((a, c) => a + c);
        }

        if (userData && userData.otherSubscriptions) {
            let otherSubscriptions = userData.otherSubscriptions.reduce((a, b) => a += b.qty, 0);
            dynoPremiumSubscriptions = dynoPremiumSubscriptions.concat(userData.otherSubscriptions);
            dynoPremiumServers += otherSubscriptions || 0;
        }

        if (userData && userData.patreonSubscriptions) {
            let patreonSubscriptions = userData.patreonSubscriptions.reduce((a, b) => a += b.qty, 0);
            dynoPremiumSubscriptions = dynoPremiumSubscriptions.concat(userData.patreonSubscriptions);
            dynoPremiumServers += patreonSubscriptions || 0;
        }

        return (
            <div>
                <div className={'columns'}>
                    <div className={'column'}>
                        <div className={'subscription premium'}>
                            <div className={'active-subscriptions'}>
                                <p>You have <strong>{dynoPremiumSubscriptions.length}</strong> Dyno Premium subscription(s), giving you a total of <strong>{dynoPremiumServers > 10000 ? '∞' : dynoPremiumServers}</strong> Dyno Premium server(s).</p>
                                <a className={'button is-info'} href='/upgrade'>Add Subscription</a>                                
                                {dynoPremiumSubscriptions.map((sub, i) => (<div key={i} className={'active-subscription'}>
                                    <div className={'subscription-header'}>
                                        <div className={'title is-5 with-image'}><img className="image is-32x32" src={'https://premium.dyno.gg/images/premium-transparent.png'} /> Dyno {sub.name || sub.planObject.name}</div>
                                        {!sub.cancelled && sub.canCancel ?
                                            (<a className={'button is-light is-rounded'} onClick={() => { if (window.confirm('Are you sure? This action is irreversible.')) { this.props.cancelSubscription(sub._id); } }}>Cancel Subscription</a>) : ''}
                                    </div>
                                    {sub.firstBillingDate && (<p>Subscribed: {moment(sub.firstBillingDate).format('Do MMMM YYYY')}</p>)}
                                    {sub.cancelled ? (<p>Subscription will expire on {moment(sub.nextBillingDate).format('Do MMMM YYYY')}</p>) : sub.nextBillingDate && (<p>Next charge: {moment(sub.nextBillingDate).format('Do MMMM YYYY')}</p>)}
                                    {sub.planObject && (<p>Amount: ${sub.planObject.price}</p>)}
                                </div>))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
		);
    }
}

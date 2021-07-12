/* globals document */

import React from 'react';
import Cookies from 'js-cookie';
import List from './List.jsx'; // eslint-disable-line no-unused-vars
import axios from 'axios';
export default class Serverlist extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            fetching: false,
            servers: { premium: [], regular: [], featured: [] },
            error: '',
        };
    }

    componentDidMount() {
        // const script = document.getElementById('_carbonads_js').innerHTML;
        // window.eval(script);
        const script = document.createElement('script');

        script.src = '//cdn.carbonads.com/carbon.js?zoneid=1673&serve=C6AILKT&placement=dynobotnet';
        script.id = '_carbonads_js';
        script.async = true;

        document.getElementById('carbon-wrapper').appendChild(script);
    }

    async componentWillMount() {
        try {
            let serversPremium = axios.get('/serverlisting/?type=premium');
            let serversRegular = axios.get('/serverlisting/?type=regular');
            let serversFeatured = axios.get('/serverlisting/?type=featured');

            [serversPremium, serversRegular, serversFeatured] = await Promise.all([serversPremium, serversRegular, serversFeatured]);

            this.setState({
                servers: {
                    premium: serversPremium.data.servers,
                    regular: serversRegular.data.servers,
                    featured: serversFeatured.data.servers,
                },
            });

            setInterval(this.refreshCookies, 25 * 60 * 1000);
        } catch (e) {
            this.setState({ error: 'Failed to load servers, try again later' });
        }
    }

    refreshCookies() {
        const expireIn = new Date(new Date().getTime() + (30 * 60 * 1000));
        Cookies.set('serverlisting_regular', Cookies.get('serverlisting_regular'), { expires: expireIn });
        Cookies.set('serverlisting_premium', Cookies.get('serverlisting_premium'), { expires: expireIn });
        Cookies.set('serverlisting_featured', Cookies.get('serverlisting_featured'), { expires: expireIn });
    }

    async getPage(number, type) {
        try {
            const servers = await axios.get(`/serverlisting/?type=${type}&page=${number}`);

            return {
                servers: servers.data.servers,
                pageCount: servers.data.pageCount,
            };
        } catch (e) {
            this.setState({ error: 'Failed to load servers, try again later' });
        }
    }

    render() {
        let regularList, premiumList, featuredList;

        if (this.state.error === '') {
            featuredList = <List featured={true} getPage={this.getPage} pagination paginationCircles />;
            premiumList = <List premium={true} getPage={this.getPage} pagination paginationCircles />;
            regularList = <List getPage={this.getPage} pagination />;
        }
        return (
            <div>
                <div className="hero">
                    <div className="container">
                        <div className="columns">
                            <div className="column is-half">
                                <h1 className="title">Discord <span style={{ color: '#0072bc' }}>Servers</span></h1>
                                <p className="hero-description">
                                    A quality, non-biased and truly fair listing with quality servers for all types of people. No bumps, no endless pages of paid servers, just quality discord servers for you to explore!
                                </p>
                                <p className='control'>
                                <input
                                    type='text'
                                    name='inviteUrl'
                                    className='input'
                                    placeholder='Search... (this doesnt work yet ok dont yell at gin)'
                                />
                                 </p>
                            </div>
                            <div className="column is-half">
                                <div className="carbon-wrapper" id='carbon-wrapper'>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="container serverlist">
                    <div className="main-wrapper">
                        <p>{this.state.error}</p>
                        <div className="list-wrapper sponsored-list-wrapper">
                            {featuredList}
                        </div>
                        <div className="list-wrapper standard-list-wrapper">
                            {premiumList}
                            {regularList}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

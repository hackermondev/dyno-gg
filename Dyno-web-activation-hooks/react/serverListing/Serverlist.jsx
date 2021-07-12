/* globals document */
/* eslint-disable no-invalid-this */

import React from 'react';
import Cookies from 'js-cookie';
import List from './List.jsx'; // eslint-disable-line no-unused-vars
import axios from 'axios';
export default class Serverlist extends React.Component {
    state = {
        fetching: false,
        error: '',
        isSearching: false,
        searchQuery: '',
    };

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
        setInterval(this.refreshCookies, 25 * 60 * 1000);
    }

    refreshCookies() {
        const expireIn = new Date(new Date().getTime() + (30 * 60 * 1000));
        Cookies.set('serverlisting_regular', Cookies.get('serverlisting_regular'), { expires: expireIn });
        Cookies.set('serverlisting_premium', Cookies.get('serverlisting_premium'), { expires: expireIn });
        Cookies.set('serverlisting_featured', Cookies.get('serverlisting_featured'), { expires: expireIn });
    }

    search = async (query) => {
        if (this.searchTimeoutId) {
            clearTimeout(this.searchTimeoutId);
        }

        // trim & remove multiple spaces, tabs, newlines
        query = query.trim().replace(/\s\s+/g, ' ');

        if (!query) {
            this.setState({
                isSearching: false,
                searchQuery: '',
            });
            return;
        }

        this.searchTimeoutId = setTimeout(() => {
            this.setState({
                isSearching: true,
                searchQuery: query,
            });
            this.searchTimeoutId = undefined;
        }, 800);
    }

    getPage = async (number, type, seedOverride) => {
        try {
            let servers;

            if (type !== 'search') {
                servers = await axios.get(`/serverlisting/?type=${type}&page=${number}${(seedOverride) ? `&seed=${seedOverride}` : ''}`);
            } else {
                servers = await axios.get(`/serverlisting/search/${this.state.searchQuery}?skip=${number * 20}`);
            }

            return {
                servers: servers.data.servers,
                pageCount: servers.data.pageCount || 0,
            };
        } catch (e) {
            this.setState({ error: 'Failed to load servers, try again later' });
        }
    }

    handleSearchInput = (event) => {
		const target = event.target;
		const value = target.value;

        this.search(value);
	}

    render() {
        let regularList, premiumList, featuredList, searchList;

        if (this.state.error === '') {
            if (this.state.isSearching) {
                searchList = <List search={true} searchQuery={this.state.searchQuery} getPage={this.getPage} pagination paginationInfiniteScroll />;
            } else {
                featuredList = <List featured={true} getPage={this.getPage} pagination paginationCircles />;
                premiumList = <List premium={true} getPage={this.getPage} pagination paginationCircles />;
                regularList = <List getPage={this.getPage} pagination />;
            }
        }
        return (
            <div>
                <div className="hero">
                    <div className="container">
                        <div className="columns">
                            <div className="column is-half">
                                <h1 className="title">Discord <span style={{ color: '#0072bc' }}>Servers</span></h1>
                                <p className="hero-description">
                                    A quality, well-made listing service that offers users a completely fair and unbiased list of servers for you to explore and join!
                                </p>
                                <p className='control'>
                                    <input
                                        type='text'
                                        className='input'
                                        placeholder='Search...'
                                        onChange={this.handleSearchInput}
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
                        {searchList &&
                            <div className="list-wrapper standard-list-wrapper">
                                {searchList}
                            </div>
                        }
                        { featuredList &&
                            <div className="list-wrapper sponsored-list-wrapper">
                                {featuredList}
                            </div>
                        }
                        { (premiumList || regularList) &&
                            <div className="list-wrapper standard-list-wrapper">
                                {premiumList || false}
                                {regularList || false}
                            </div>
                        }
                    </div>
                </div>
            </div>
        );
    }
}

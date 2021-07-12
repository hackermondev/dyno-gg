/* globals document */
/* eslint-disable no-invalid-this */

import React from 'react';
import Cookies from 'js-cookie';
import List from './List.jsx'; // eslint-disable-line no-unused-vars
import axios from 'axios';
import RichSelect from '../dashboard/common/RichSelect.jsx';
import '!style-loader!css-loader!../dashboard/styles/selector.css';
import '!style-loader!css-loader!./styles/select.css';


export default class Serverlist extends React.Component {
    state = {
        fetching: false,
        error: '',
        isSearching: false,
        searchQuery: '',
        selectedSort: '',
        categories: [],
        categoryExpanded: false,
    };

    async componentDidMount() {
        // const script = document.getElementById('_carbonads_js').innerHTML;
        // window.eval(script);
        const script = document.createElement('script');

        script.src = '//cdn.carbonads.com/carbon.js?zoneid=1673&serve=C6AILKT&placement=dynobotnet';
        script.id = '_carbonads_js';
        script.async = true;

        // document.getElementById('carbon-wrapper').appendChild(script);
        for (let e of document.getElementsByClassName('carbon-wrapper')) {
            e.appendChild(script);
        }

        const categories = await axios.get('/serverlisting/getCategories');
        this.setState({ categories: categories.data.categoriesInfo });
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
                if (type === 'regular') {
                    servers = await axios.get(`/serverlisting/?type=${type}&page=${number}&sort=${this.state.selectedSort || 'random'}${(seedOverride) ? `&seed=${seedOverride}` : ''}${this.state.category ? `&category=${this.state.category}` : ''}`);
                } else {
                    servers = await axios.get(`/serverlisting/?type=${type}&page=${number}${(seedOverride) ? `&seed=${seedOverride}` : ''}`);
                }
            } else {
                servers = await axios.get(`/serverlisting/search/${this.state.searchQuery}?skip=${number * 12}${this.state.category ? `&category=${this.state.category}` : ''}&sort=${this.state.selectedSort || 'relevance'}`);
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

    handleSort = (props, selectedOption) => {
        let value;
        if (selectedOption) {
            value = selectedOption.value;
        }

        this.setState({ selectedSort: value });
    }

    render() {
        let regularList, premiumList, featuredList, searchList;

        let sortOptions = [
            {
                label: 'Members',
                value: 'memberCount',
            },
        ];

        let sortSelect = (
            <div className="sort-wrapper">
                <RichSelect
                    hideLabel={true}
                    defaultValue={this.state.selectedSort}
                    defaultOption='Sort by..'
                    options={sortOptions}
                    onChange={this.handleSort.bind(this)} />
            </div>
        );

        if (this.state.isSearching) {
            sortOptions = [
                {
                    label: 'Relevance',
                    value: 'relevance',
                },
                {
                    label: 'Members',
                    value: 'memberCount',
                },
            ];

            sortSelect = (
                <div className="sort-wrapper">
                    <RichSelect
                        hideLabel={true}
                        defaultValue='relevance'
                        defaultOption='Relevance'
                        clearable={false}
                        options={sortOptions}
                        onChange={this.handleSort.bind(this)} />
                </div>
            );
        }

        let categories;

        if (!this.state.category || window.screen.width <= 1088) {
            categories = this.state.categories;
        } else {
            let currCat;
            categories = this.state.categories.filter((cat) => {
                if (cat.fullName === this.state.category) {
                    currCat = cat;
                    return false;
                }

                return true;
            });

            categories = [currCat, ...categories];
        }

        const pagination = !this.props.isMainPage;

        if (this.state.error === '') {
            if (this.state.isSearching) {
                searchList = <List category={this.state.category} sortSelect={sortSelect} sort={this.state.selectedSort} search={true} searchQuery={this.state.searchQuery} getPage={this.getPage} pagination={pagination} paginationInfiniteScroll isMainPage={this.props.isMainPage} />;
            } else {
                featuredList = <List featured={true} getPage={this.getPage} pagination={pagination} paginationCircles />;
                premiumList = <List premium={true} getPage={this.getPage} pagination={pagination} paginationCircles />;
                regularList = <List category={this.state.category} sort={this.state.selectedSort} sortSelect={sortSelect} getPage={this.getPage} pagination={pagination} isMainPage={this.props.isMainPage} />;
            }
        }

        const categorySelector = (
            <div className={`categories-container ${this.state.categoryExpanded ? 'expanded' : ''}`}>
                <div className={`categories-wrapper ${this.state.categoryExpanded ? 'expanded' : ''}`}>
                    <div className={`category-box ${!this.state.category ? 'active' : ''}`} onClick={() => this.setState({ category: null })}>
                        <span className="category-label">All Categories</span>
                    </div>
                    {categories &&
                        categories.map((cat, i) => {
                            let additionalClass = '';

                            if (this.state.category === cat.fullName) {
                                additionalClass += 'active';
                            }
                            return (
                                <div key={i} className={`category-box ${additionalClass}`} onClick={() => this.setState({ category: cat.fullName })}>
                                    <span className="category-label">#{cat.fullName.toLowerCase()}</span>
                                </div>
                            );
                        })
                    }
                </div>
                <span className={`categories-expand ${this.state.categoryExpanded ? 'expanded' : ''}`} onClick={() => this.setState({ categoryExpanded: !this.state.categoryExpanded })}>
                    {
                        this.state.categoryExpanded ? <i className="fal fa-angle-up fa-lg"></i> : <i className="fal fa-angle-down fa-lg"></i>
                    }
                </span>
            </div>
        );

        const title = (this.props.isMainPage) ? 'Dyno. Discord Platform' : 'Discord Servers';
        return (
            <div>
                <div className="container serverlist serverlist-staff">
                    {this.props.isMainPage &&
                        <img className="home-logo" src="https://s.dyno.gg/web-assets/landing/logo.png" />
                    }
                    <div className="columns is-multiline search-container">
                        <div className="column is-half is-full-touch">
                            <h1 className="title">{title}</h1>
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
                        <div className="column is-half is-full-touch carbon-container">
                            <div className="carbon-wrapper" id='carbon-wrapper'>
                            </div>
                            {!this.props.isMainPage &&
                                <div className="is-hidden-touch category-outter-wrapper">{categorySelector}</div>
                            }
                        </div>
                    </div>
                    <div className="main-wrapper">
                        {!this.props.isMainPage &&
                            <div className="is-hidden-desktop category-outter-wrapper">{categorySelector}</div>
                        }
                        <p>{this.state.error}</p>
                        {searchList || false}
                        {/* { !this.props.isMainPage && featuredList &&
                            <div className="list-wrapper featured-list-wrapper">
                                {featuredList}
                            </div>
                        }
                        { !this.props.isMainPage && premiumList &&
                            <div className="list-wrapper sponsored-list-wrapper">
                                {premiumList || false}
                            </div>
                        } */}
                        {/* { !this.props.isMainPage && */}
                            <div className="list-wrapper standard-list-wrapper">
                                {regularList || false}
                            </div>
                        {/* } */}
                    </div>
                    {this.props.isMainPage &&
                        <div className="listing-footer">
                            <div className='horizontal-spacer'></div>
                            <a href='/servers' className="button is-info is-medium is-rounded">See all servers</a>
                            <div className='horizontal-spacer'></div>
                        </div>
                    }
                </div>
            </div>
        );
    }
}

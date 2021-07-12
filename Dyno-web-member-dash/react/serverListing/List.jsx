/* globals window document */
/* eslint-disable no-invalid-this */
import React from 'react';
import ListItem from './ListItem.jsx';
import ListItemSkeleton from './ListItemSkeleton.jsx';

export default class List extends React.Component {
    constructor() {
        super();

        this.state = {
            servers: [],
            pageCount: 1,
            activePage: 0,
            isLoading: true,
            hasMoreContent: true,
        };

        this.changePage = this.changePage.bind(this);
        this.buildPages = this.buildPages.bind(this);
    }

    async componentWillReceiveProps(nextProps) {
        if (this.props.isShowcase) {
            this.setState({
                servers: nextProps.servers,
            });
        }

        if (this.props.search && nextProps.searchQuery) {
            this.setState({ isLoading: true });

            const serversInfo = await this.props.getPage(0, this.type);

            this.setState({
                servers: serversInfo.servers || [],
                pageCount: serversInfo.pageCount,
                activePage: 0,
                isLoading: false,
                hasMoreContent: true,
            });
        }
    }

    async componentWillMount() {
        if (this.props.isShowcase) {
            this.setState({
                servers: this.props.servers,
                isLoading: false,
            });
            return;
        }
        if (this.props.featured) {
            this.type = 'featured';
        } else if (this.props.premium) {
            this.type = 'premium';
        } else if (this.props.search) {
            this.type = 'search';
            window.onscroll = this.handleScroll;
        } else {
            this.type = 'regular';
        }

        try {
            const serversInfo = await this.props.getPage(0, this.type);

            this.setState({
                servers: serversInfo.servers || [],
                pageCount: serversInfo.pageCount,
                activePage: 0,
                isLoading: false,
                // We return at most 20 entires from the backend. Less than that means end of the list
                hasMoreContent: serversInfo.servers.length === 20,
            });
        } catch (e) {
            this.setState({ error: 'Failed to load servers, try again later' });
        }
    }

    handleScroll = () => {
        if (this.state.isLoading || !this.state.hasMoreContent) return;

        // Checks that the page has scrolled to the bottom
        if (window.innerHeight + document.documentElement.scrollTop === document.documentElement.offsetHeight) {
            this.changePage(this.state.activePage + 1);
        }
    };

    async changePage(page) {
        this.setState({ isLoading: true, activePage: page });

        if (this.type !== 'search' && !this.props.premium && !this.props.featured) {
            window.scrollBy({ top: document.getElementsByClassName('server-list-wrapper premium')[0].getBoundingClientRect().top + 50, behavior: 'smooth' });
        }

        const serversInfo = await this.props.getPage(page, this.type);

        let servers;
        serversInfo.servers = serversInfo.servers || [];

        if (this.type === 'search') {
            servers = this.state.servers.slice(0);
            servers.push(...serversInfo.servers);
        } else {
            servers = serversInfo.servers;
        }

        this.setState({
            servers: servers,
            isLoading: false,
            // We return at most 20 entires from the backend. Less than that means end of the list
            hasMoreContent: serversInfo.servers.length === 20,
        });
    }

    buildHeader() {
        if (!this.props.search) return false;

        const premiumList = <List premium={true} getPage={(page, type) => this.props.getPage(page, type, new Date().getTime())} pagination paginationCircles />;

        return (
            <div>
                {premiumList}
            </div>
        );
    }

    buildFooter() {
        if (!this.props.search) return false;
        if (this.state.hasMoreContent) return false;

        return (
            <div>
                <div className="search-footer">
                    <h2><i class="fas fa-binoculars fa-2x"></i><span>We searched far and wide and found nothing more</span></h2>
                </div>
            </div>
        );
    }

    buildPages() {
        const pages = [...Array(this.state.pageCount).keys()];
        if (!this.props.paginationCircles && !this.props.paginationInfiniteScroll) {
            if (pages.length < 10) {
                return (
                    <ul className="pagination-list">
                        {pages.map((p, i) => {
                            let liClasses = '';
                            if (p === this.state.activePage) {
                                liClasses += 'active';
                            }

                            return (<li className={liClasses} key={i}>
                                <a className="page" onClick={() => this.changePage(p)}>{p + 1}</a>
                            </li>);
                        })}
                    </ul>
                );
            }
        } else if (this.props.paginationCircles) {
            return (
                <ul className="pagination-list circles">
                    {pages.map((p, i) => {
                        let liClasses = '';
                        if (p === this.state.activePage) {
                            liClasses += 'active';
                        }

                        return (<li className={liClasses} key={i}>
                            <span className="page-circle" onClick={() => this.changePage(p)}></span>
                        </li>);
                    })}
                </ul>
            );
        } else if (this.props.paginationInfiniteScroll) {
            if (this.state.isLoading) {
                return (
                    <div class="lds-ring"><div></div><div></div><div></div><div></div></div>
                );
            }

            return false;
        }
    }

    render() {
        if (this.state.error) {
            return <p>{this.state.error}</p>;
        }

        let title;
        let skeletonSize = 20;
        let additionalClasses = '';
        if (this.props.featured) {
            additionalClasses += 'vertical ';
            skeletonSize = 5;
            title = 'Featured';
        }

        if (this.props.premium) {
            additionalClasses += 'premium ';
            skeletonSize = 5;
            title = 'Sponsored';
        }

        if (this.props.search) {
            skeletonSize = 0;
            title = 'Search Results';
        }

        let listNodes;
        if (this.state.isLoading && this.type !== 'search') {
            listNodes = [];
            for (let i = 0; i < skeletonSize; i++) {
                listNodes.push((<ListItemSkeleton additionalClasses={additionalClasses} key={i} />));
            }
        } else {
            listNodes = this.state.servers.map((server, index) => <ListItem key={index} server={server} featured={this.props.featured} premium={this.props.premium} />);
        }
        return (
            <div className={`server-list-wrapper ${additionalClasses}`}>
                {this.buildHeader()}

                {title &&
                    <div className="list-title">
                        <h1>{title}</h1>
                    </div>
                }
                <div className={`server-list ${additionalClasses}`}>
                    {listNodes}
                    {this.props.pagination &&
                        <nav className="pagination" role="navigation" aria-label="pagination">
                            {this.buildPages()}
                        </nav>
                    }
                </div>
                {this.buildFooter()}
            </div>
        );
    }
}

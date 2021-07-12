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
            pageLimit: 10,
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

        if ((this.props.category !== nextProps.category) ||
            (this.props.sort !== nextProps.sort) ||
            (nextProps.search !== undefined) ||
            (nextProps.searchQuery !== undefined)) {
            await this.reloadServers();
        }
    }

    async reloadServers() {
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
                hasMoreContent: serversInfo.servers.length === 12,
            });
        } catch (e) {
            this.setState({ error: 'Failed to load servers, try again later' });
        }
    }

    handleScroll = () => {
        if (this.state.isLoading ||
            !this.state.hasMoreContent ||
            !this.props.pagination ||
            !this.props.paginationInfiniteScroll)
            return;

        // Checks that the page has scrolled to the bottom
        if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 1) {
            this.changePage(this.state.activePage + 1);
        }
    };

    async changePage(page) {
        this.setState({ isLoading: true, activePage: page });

        if (this.type !== 'search' && !this.props.premium && !this.props.featured) {
            const elem = document.getElementsByClassName('server-list-wrapper premium')[0];
            if (elem) {
                window.scrollBy({ top: elem.getBoundingClientRect().top + 50, behavior: 'smooth' });
            }
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
            hasMoreContent: serversInfo.servers.length === 12,
        });
    }

    buildHeader() {
        return false;
        if (!this.props.search || this.props.isMainPage) return false;

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
                    <div className="separator"></div>
                </div>
            </div>
        );
    }

    buildPages() {
        let pages = [...Array(this.state.pageCount).keys()];
        if (!this.props.paginationCircles && !this.props.paginationInfiniteScroll) {
            let { activePage, pageLimit, pageCount } = this.state;

            if (pageCount < pageLimit) {
                return <ul className="pagination-list">{pages.map((p, i) => (
                        <li key={`page-${i}`} className={p === activePage ? 'active' : ''}>
                            <a className='page' onClick={this.changePage.bind(this, p)}>{p + 1}</a>
                        </li>
                    ))}
                </ul>;
            }

            // Places the active page around the middle if possible
            let startPage = activePage - (pageLimit / 2);
            if (startPage < 0) {
                startPage = 0;
            }

            pages = [];

            let i = 0;
            if (activePage > (pageLimit / 2)) {
                pages.push((
                    <li key={`page-${i++}`}>
                        <a className='page' onClick={this.changePage.bind(this, 0)}>1</a>
                    </li>
                ));
                pages.push((<li key="page-dots1"><a>...</a></li>));
            }


            for (let i = 1; i <= pageLimit; i++) {
                let p = startPage + i;
                if (p > pageCount) {
                    break;
                }

                pages.push((
                    <li key={`page-${i}`} className={p === activePage + 1 ? 'active' : ''}>
                        <a className='page' onClick={this.changePage.bind(this, p - 1)}>{p}</a>
                    </li>
                ));
            }

            if (activePage < pageCount - (pageLimit / 2)) {
                pages.push((<li key="page-dots2"><a>...</a></li>));
                pages.push((
                    <li key={`page-${pageCount}`}>
                        <a className='page' onClick={this.changePage.bind(this, pageCount - 1)}>{pageCount}</a>
                    </li>
                ));
            }

            return <ul className="pagination-list">{pages}</ul>;
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
                    <div className="lds-ring"><div></div><div></div><div></div><div></div></div>
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
        let subTitle;
        let skeletonSize = 12;
        let additionalClasses = '';
        if (this.props.featured) {
            additionalClasses += 'vertical ';
            skeletonSize = 4;
            title = 'Featured';
            subTitle = 'Selected Dyno Server';
        } else if (this.props.premium) {
            additionalClasses += 'premium ';
            skeletonSize = 3;
            title = 'Sponsored';
            subTitle = 'Our recommended servers';
        } else {
            additionalClasses += 'regular ';
            title = (this.props.isMainPage) ? 'Discord Servers' : 'All Servers';
            subTitle = 'List of all discord servers';
        }

        subTitle = '';

        if (this.props.search) {
            skeletonSize = 0;
            title = 'Search Results';
        }

        if (this.props.isShowcase) {
            title = '';
            additionalClasses += 'showcase ';
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

                { title &&
                    <div className="list-title">
                        <h1 className="is-size-3">{title}</h1>
                        { !this.props.isShowcase &&
                            <h3 className="is-size-5 has-text-grey">{subTitle}</h3>
                        }
                    </div>
                }

                {/* {this.props.sortSelect} */}
                <div className={`server-list ${additionalClasses}`}>
                    {listNodes}
                </div>
                {this.props.pagination &&
                        <nav className="pagination" role="navigation" aria-label="pagination">
                            {this.buildPages()}
                        </nav>
                }
                {this.buildFooter()}
            </div>
        );
    }
}

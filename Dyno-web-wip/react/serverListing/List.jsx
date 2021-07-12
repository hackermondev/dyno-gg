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
        } else {
            this.type = 'regular';
        }

        try {
            const serversInfo = await this.props.getPage(0, this.type);

            this.setState({
                servers: serversInfo.servers,
                pageCount: serversInfo.pageCount,
                activePage: 0,
                isLoading: false,
            });
        } catch (e) {
            this.setState({ error: 'Failed to load servers, try again later' });
        }
    }

    async changePage(page) {
        this.setState({ isLoading: true, activePage: page });

        const serversInfo = await this.props.getPage(page, this.type);

        this.setState({
            servers: serversInfo.servers,
            isLoading: false,
        });
    }

    buildPages() {
        const pages = [...Array(this.state.pageCount).keys()];
        if (!this.props.paginationCircles) {
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
        } else {
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

        let listNodes;
        if (this.state.isLoading) {
            listNodes = [];
            for (let i = 0; i < skeletonSize; i++) {
                listNodes.push((<ListItemSkeleton additionalClasses={additionalClasses} key={i}/>));
            }
        } else {
            listNodes = this.state.servers.map((server, index) => <ListItem key={index} server={server} featured={this.props.featured} premium={this.props.premium} />);
        }
        return (
            <div className={`server-list-wrapper ${additionalClasses}`}>
            { title &&
                <div className="list-title">
                    <h1>{title}</h1>
                </div>
            }
                <div className={`server-list ${additionalClasses}`}>
                    {listNodes}
                    { this.props.pagination &&
                        <nav className="pagination" role="navigation" aria-label="pagination">
                            {this.buildPages()}
                        </nav>
                    }
                </div>
            </div>
        );
    }
}

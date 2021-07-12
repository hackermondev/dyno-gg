import React from 'react';

export default class ListItem extends React.Component {
    state = {
    }

    componentDidMount() {
        const randomColor = [
            '#96cdcd',
            '#cd6889',
            '#eec5b7',
            '#7ccd7c',
            '#cdb7b5',
            '#eeeed1',
            '#8db6cd',
            '#8b8b83',
        ];

        this.setState({ randomColor: randomColor[Math.floor(Math.random() * randomColor.length)] });
    }

    buildIcons() {
        const links = this.props.server.links || [];

        return links.map((l, i) => {
            if (l.type === 'youtube') {
                return (<a href={l.url} title="Youtube" className="media-icon youtube" style={{ fontFamily: '"Font Awesome 5 Brands"', color: 'white' }} key={i} target="_blank"></a>);
            } else if (l.type === 'twitter') {
                return (<a href={l.url} title="Twitter" className="media-icon twitter" style={{ fontFamily: '"Font Awesome 5 Brands"', color: 'white' }} key={i} target="_blank"></a>);
            } else if (l.type === 'twitch') {
                return (<a href={l.url} title="Twitch" className="media-icon twitch" style={{ fontFamily: '"Font Awesome 5 Brands"', color: 'white' }} key={i} target="_blank"></a>);
            } else if (l.type === 'reddit') {
                return (<a href={l.url} title="Reddit" className="media-icon reddit" style={{ fontFamily: '"Font Awesome 5 Brands"', color: 'white' }} key={i} target="_blank"></a>);
            }
            return false;
        });
    }
    render() {
        let style = {};
        if (this.props.server.featured && this.props.featured && this.props.server.backgroundImageVertical) {
            style = { backgroundImage: `url(${this.props.server.backgroundImageVertical})` };
        } else if ((this.props.server.premium || this.props.server.featured) && this.props.server.backgroundImage) {
            style = { backgroundImage: `url(${this.props.server.backgroundImage})` };
        }
        // else {
        //     style = {
        //         backgroundImage: 'url(https://s.dyno.gg/server-listing/squares.png)',
        //         backgroundSize: 'auto',
        //         backgroundRepeat: 'repeat',
        //         backgroundColor: '#2f2f2f',
        //     };
        // }
        style.backgroundColor = style.backgroundColor || '#3B3D43';

        if (this.props.server.borderColor) {
            style.borderColor = this.props.server.borderColor;
        }

        let iconStyle = {
            backgroundColor: '#666',
            backgroundImage: `url(${this.props.server.icon || '/images/v3/dyno-44.svg'})`,
        };

        let inviteUrl = `/server/${this.props.server.id}/invite`;
        const links = this.props.server.links || [];
        const hasIcons = links && links.length > 0;
        const extraDescriptionClasses = (!hasIcons) ? 'no-icons' : '';

        return (
            // linear-gradient(1deg, rgba(26,39,55,1) 15%, rgba(26,39,55,0.68) 95%, rgba(26,39,55,0.65) 100%);
            <div className="server-list-item-wrapper" style={style}>
                <div className="server-list-card">
                    <div className="server-list-card-header">
                        <div alt="server icon" className="server-list-item-icon"
                            style={iconStyle} ></div>
                        {hasIcons && (this.props.premium || this.props.featured) &&
                            <div className="server-media-icons">
                                {this.buildIcons()}
                            </div>
                        }
                        { !this.props.premium && !this.props.featured && 
                            <div className="regular-join-wrapper">
                                <a className="server-join-regular button is-info is-rounded" href={inviteUrl} target="_blank"><strong>Join</strong></a>
                            </div>
                        }
                    </div>
                    <div className="server-name is-size-4" title={this.props.server.name}>{this.props.server.name}</div>
                    <div className="server-member-count is-size-6"><span>{this.props.server.memberCount}</span> members</div>
                    <div className={`server-description ${extraDescriptionClasses}`}>
                        { !this.props.premium &&
                            <div className="server-description-content-wrapper">
                                <p>{this.props.server.description}</p>
                            </div>
                        }
                        { this.props.featured && this.props.server.categories && this.props.server.categories.length > 0 && 
                            <div className="tag-wrapper">
                                {
                                    this.props.server.categories.slice(0, 2).map((cat, i) => {
                                        return (<span className="category-tag" key={i}>#{cat.toLowerCase()}</span>);
                                    })
                                }
                            </div>
                        }
                        { (this.props.premium || this.props.featured) && 
                            <a className="server-join button is-info is-rounded" href={inviteUrl} target="_blank"><strong>Join</strong></a>
                        }
                    </div>
                </div>
            </div>
        );
    }
}

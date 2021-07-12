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
                return (<a href={l.url} title="Youtube" className="media-icon youtube" style={{ fontFamily: '"Font Awesome 5 Brands"', color: 'white' }} key={i}></a>);
            } else if (l.type === 'twitter') {
                return (<a href={l.url} title="Twitter" className="media-icon twitter" style={{ fontFamily: '"Font Awesome 5 Brands"', color: 'white' }} key={i}></a>);
            } else if (l.type === 'twitch') {
                return (<a href={l.url} title="Twitch" className="media-icon twitch" style={{ fontFamily: '"Font Awesome 5 Brands"', color: 'white' }} key={i}></a>);
            } else if (l.type === 'reddit') {
                return (<a href={l.url} title="Reddit" className="media-icon reddit" style={{ fontFamily: '"Font Awesome 5 Brands"', color: 'white' }} key={i}></a>);
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
        } else {
            style = {
                backgroundImage: 'url(https://s.dyno.gg/server-listing/squares.png)',
                backgroundSize: 'auto',
                backgroundRepeat: 'repeat',
                backgroundColor: '#2f2f2f',
            };
        }
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
            <div className="server-list-item-wrapper">
                <div style={style} className="server-list-card">
                    <div className={`server-description ${extraDescriptionClasses}`}>
                        { hasIcons &&
                            <div className="server-media-icons">
                                {this.buildIcons()}
                            </div>
                        }
                        <div className="server-description-content-wrapper">
                            <p>{this.props.server.description}</p>
                        </div>
                        <a className="server-join" href={inviteUrl} target="_blank"><i className="fas fa-sign-in"></i> <strong>Join</strong></a>
                    </div>
                    <div className="server-icon-wrapper">
                        <div alt="server icon" className="server-list-item-icon"
                            style={iconStyle} />
                    </div>
                </div>
                <div className="server-list-card-footer">
                    <p className={`server-name ${extraDescriptionClasses}`} title={this.props.server.name}>{this.props.server.name}</p>
                </div>
            </div>
        );
    }
}

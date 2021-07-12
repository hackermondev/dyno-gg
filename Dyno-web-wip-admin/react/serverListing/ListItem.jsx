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
    render() {
        let style = {};
        if (this.props.featured && this.props.server.backgroundImageVertical) {
            style = { backgroundImage: `url(${this.props.server.backgroundImageVertical})` };
        } else if (this.props.server.backgroundImage) {
            style = { backgroundImage: `url(${this.props.server.backgroundImage})` };
        } else {
            style = {
                // backgroundImage: 'url(https://cdn.discordapp.com/attachments/403739275566383116/430848647740260373/Dynov3whitex1200.png)',
                backgroundSize: '128px 128px',
                backgroundColor: '#2f2f2f',
            };
        }
        style.backgroundColor = style.backgroundColor || '#3B3D43';

        // if (this.props.premium) {
        //     style.borderColor = 'yellow';
        // } else if (this.props.server.premium) {
        //     style.borderColor = 'red';
        // }

        if (this.props.server.borderColor) {
            style.borderColor = this.props.server.borderColor;
        }

        let iconStyle = {
            backgroundColor: '#666',
            backgroundImage: `url(${this.props.server.icon})`,
        };

        let inviteUrl = `/server/${this.props.server.id}/invite`;
        return (
            <div className="server-list-item-wrapper">
                <div style={style} className="server-list-card">
                    <div className="server-description">
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
                    <p className="server-name" title={this.props.server.name}>{this.props.server.name}</p>
                </div>
            </div>
        );
    }
}

import React from 'react';
import axios from 'axios';

export default class ServerPage extends React.Component {
    constructor() {
        super();
        this.state = {
            error: false,
            server: {},
        };
    }

    async componentWillMount() {
        try {
            let server = await axios.get(`/serverlisting/server/${guildId}`);

            this.setState({
                server: server.data,
            });
        } catch (e) {
            this.setState({ error: 'Failed to load server, try again later' });
        }
    }

    render() {
        if (this.state.error) {
            return (<h1>Failed to load server data</h1>);
        }

        const iconStyle = { backgroundImage: `url(${this.state.server.icon})` };

        return (
            <div className='server-page content-wrapper'>
                <div className='server-header'>
                    <div className='server-icon-wrapper'>
                        <div className='server-icon' style={iconStyle}>
                        </div>
                    </div>
                    <h1 className='server-name'>{this.state.server.name}</h1>
                </div>
                <div className='server-description'>
                    
                </div>
            </div>
        );
    }
}

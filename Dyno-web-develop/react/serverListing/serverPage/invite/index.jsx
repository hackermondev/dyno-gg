import React from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';

class ServerPageInvite extends React.Component {
    constructor() {
        super();
        this.state = {
            error: '',
            invite: '',
            server: {},
        };

        this.recaptchaSuccess = this.recaptchaSuccess.bind(this);
        // global defined in .hbs
        _recaptchaCallback = this.recaptchaSuccess;
    }

    componentDidMount() {
        return;
        const script = document.createElement('script');

        script.src = '//cdn.carbonads.com/carbon.js?zoneid=1673&serve=C6AILKT&placement=dynobotnet';
        script.id = '_carbonads_js';
        script.async = true;

        document.getElementById('carbon-wrapper').appendChild(script);
    }

    async UNSAFE_componentWillMount() {
        try {
            let server = await axios.get(`/serverlisting/server/${guildId}`);

            this.setState({
                server: server.data,
            });
        } catch (e) {
            this.setState({ error: 'Failed to load server, try again later' });
        }
    }

    async recaptchaSuccess(token) {
        const requestUrl = `/serverlisting/server/${guildId}/inviteUrl/${token}`;
        try {
            const data = await axios.get(requestUrl);
            this.setState({ invite: data.data });
            window.location.replace(data.data);
        } catch (err) {
            this.setState({ error: err.message });
        }
    }

    render() {
        return (
            <div>
                <div className="hero">
                    <div className="container">
                        <div className="columns">
                            <div className="column is-12">
                                <div className="carbon-wrapper" id='carbon-wrapper'>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                { this.state.error && <div>{this.state.error}</div> }
                { !this.state.error &&
                    <div className='invite-content-wrapper'>
                        <div
                            className="g-recaptcha"
                            data-sitekey={recaptchaKey}
                            data-callback="recaptchaCallback"
                            data-theme='dark'
                        >
                        </div>
                    </div>
                }
            </div>
        );
    }
}

ReactDOM.render(
    <ServerPageInvite />,
    document.getElementById('serverpageinvite-mount'),
);

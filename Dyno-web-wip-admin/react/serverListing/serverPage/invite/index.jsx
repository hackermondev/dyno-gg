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
            <div
                className="g-recaptcha"
                data-sitekey={recaptchaKey}
                data-callback="recaptchaCallback"
                data-theme='dark'
            >
            </div>
        );
    }
}

ReactDOM.render(
    <ServerPageInvite />,
    document.getElementById('serverpageinvite-mount'),
);

import axios from 'axios';
import React from 'react';
import OauthPopup from '../../common/OauthPopup.jsx';

export default class Patreon extends React.Component {
	oauthURL = `https://www.patreon.com/oauth2/authorize?response_type=code&client_id=e4bf3c3950d08803fcdd86f1a653ceb21ee94d9760c944ef7e9b16723234a8c2&redirect_uri=http://localhost:8000/patreon`;
		// &state=<optional string>`;

	onCode = async (code, params) => {
		try {
			const response = await axios.post(`/patreon/process`, { code });
			console.log(response.data);
		} catch (err) {
			console.error(err);
		}
		console.log(code, params);
	}

    render() {
		console.log(this.oauthURL);
        return (
            <div className={'columns'}>
                <div className={'column'}>
                    <div className={'subscription patreon'}>
						<OauthPopup url={this.oauthURL} type='patreon' onCode={this.onCode} height={800}>
							<div>Click me to open a Popup</div>
						</OauthPopup>
                    </div>
                </div>
            </div>
        );
    }
}

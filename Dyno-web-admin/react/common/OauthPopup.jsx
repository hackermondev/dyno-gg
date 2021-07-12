import Cookies from 'universal-cookie';
import * as React from 'react';

export default class OauthPopup extends React.PureComponent {
	static defaultProps = {
		onClose: () => {},
		width: 500,
		height: 500,
		url: '',
		title: '',
		type: '',
	};

	externalWindow = null;
	codeCheck = null;

	createPopup = () => {
		const cookies = new Cookies();
		const { url, title, width, height, onCode } = this.props;
		const left = window.screenX + (window.outerWidth - width) / 2;
		const top = window.screenY + (window.outerHeight - height) / 2.5;

		cookies.set(`oauth-${this.props.type}`, '1', { path: '/' });

		this.externalWindow = window.open(
			url,
			title,
			`width=${width},height=${height},left=${left},top=${top}`
		);

		this.codeCheck = setInterval(() => {
			if (this.externalWindow.closed) {
				cookies.remove(`oauth-${this.props.type}`);
				this.props.onClose();
				clearInterval(this.codeCheck);
			}
			try {
				const params = new URL(this.externalWindow.location).searchParams;
				const code = params.get('code');
				if (!code) {
					return;
				}
				clearInterval(this.codeCheck);
				onCode(code, params);
				this.externalWindow.close();
			} catch (e) { }
		}, 20);

		this.externalWindow.onbeforeunload = () => {
			cookies.remove(`oauth-${this.props.type}`);
			this.props.onClose();
			clearInterval(this.codeCheck);
		};
	};

	render() {
		return <div onClick={this.createPopup}> {this.props.children} </div>;
	}

	componentWillUnmount() {
		if (this.externalWindow) {
			this.externalWindow.close();
		}
	}
}

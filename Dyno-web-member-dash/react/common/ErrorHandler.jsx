import React from 'react';

export default class ErrorHandler extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    componentDidCatch(error, info) {
        this.setState({ hasError: true });
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className='react-error-wrapper'>
                    <i class="fas fa-times-circle fa-6x"></i>
                    <h1>Oops. Something went wrong</h1>
                    <h3>Please try again. If the error persists, let us know in our <a href='https://discordapp.com/invite/dyno'>support server</a></h3>
                </div>
            );
        }
        return this.props.children;
    }
}

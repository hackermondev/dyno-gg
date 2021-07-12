/* globals window */

import React from 'react';

export default class FeatureLocker extends React.Component {
    state = {
        unlocked: false,
    };

    childrenRef = {
        getBoundingClientRect: () => { return { height: 0, width: 0 }; },
    }

    componentDidMount() {
        window.onresize = () => {
            if (!this.state.unlocked && this.props.isLocked) {
                this.forceUpdate();
            }
        };

        this.forceUpdate();
    }

    render() {
        let { height, width } = this.childrenRef.getBoundingClientRect();
        return (
            <div>
                { (this.props.isLocked && !this.state.unlocked) &&
                    <div className="feature-locker-wrapper">
                        <div className="feature-locker-panel" style={{ height, width }}>
                            <i className="fas fa-lock-alt fa-6x"></i>
                            <span className="feature-locker-title">{this.props.title || 'This feature is premium'}</span>
                            <span className="feature-locker-description">
                                To unlock it, head over to our <a href='/upgrade'>upgrade page</a>
                            </span>
                        </div>
                    </div>
                }
                <div ref={(r) => { this.childrenRef = r; }}>
                    {this.props.children}
                </div>
            </div>
        );
    }
}

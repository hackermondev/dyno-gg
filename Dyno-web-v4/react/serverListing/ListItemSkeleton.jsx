import React from 'react';

export default class ListItemSkeleton extends React.Component {
    render() {
        return (
            <div className={`server-list-item-wrapper skeleton ${this.props.additionalClasses}`}>
                <div className="server-list-card">
                    <div className="skeleton-icon"></div>
                </div>
                <div className="server-list-card-footer">
                    <div className="skeleton-name"></div>
                </div>
            </div>
        );
    }
}

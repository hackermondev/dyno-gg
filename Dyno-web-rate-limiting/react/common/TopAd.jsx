import React from 'react';
import { Bling as GPT } from 'react-gpt';

GPT.enableSingleRequest();

export default class TopAd extends React.Component {
    render() {
        let classNames = 'top-ad-container';
        if (this.props.isHiddenMobile) {
            classNames += ' is-hidden-mobile';
        }
        return (
            <div className={classNames}>
                <GPT
                    adUnitPath="/22280732/DynoGG_728x90_Other_ATF1"
                    sizeMapping={[
                        { viewport: [1, 0], slot: [300, 250] },
                        { viewport: [450, 0], slot: [[728, 90], [320, 100], [320, 50]] },
                        { viewport: [728, 0], slot: [[728, 90], [970, 250], [970, 90], [728, 280]] },
                    ]}
                />
            </div>
        );
    }
}

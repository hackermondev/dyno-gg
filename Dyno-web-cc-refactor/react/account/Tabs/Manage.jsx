import React from 'react';

export default class Manage extends React.Component {
    render() {
        return (
            <div className={'columns'}>
                <div className={'column'}>
                    <div className={'subscription manage'}>
                        { this.props.guilds.map((g, i) => {
                            let style = {};
                            if (g.icon) {
                                style.backgroundImage = `url(https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=256)`;
                            } else {
                                style.backgroundImage = 'url(/images/v3/dyno-44.svg)';
                                style.backgroundSize = '128px 128px';
                                style.backgroundPosition = '50% 30%';
                                style.backgroundBlendMode = 'soft-light';
                            }

                            return (
                                <a href={`/manage/${g.id}`} className='server-tile' style={style} key={i}>
                                    <div className='server-name'>{g.name}</div>
                                </a>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }
}

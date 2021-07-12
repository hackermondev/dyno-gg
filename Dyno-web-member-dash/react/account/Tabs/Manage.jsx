import React from 'react';
import { ContextMenu, Item, ContextMenuProvider } from 'react-contexify';
import * as Contexify from 'react-contexify';
import 'react-contexify/dist/ReactContexify.min.css';

const onClick = ({ event, ref, data, dataFromProvider }) => {
    console.log(dataFromProvider);
};

const ManageContextMenu = () => (
    <ContextMenu id="manage-ContextMenu">
       <Item onClick={onClick}>Member Dashboard</Item>
       <Item onClick={onClick}>Manage Server</Item>
    </ContextMenu>
);

export default class Manage extends React.Component {
    render() {
        return (
            <div className={'columns'}>
                <div className={'column'}>
                    <div className={'subscription manage'}>
                        { this.props.guilds.sort((a, b) => this.props.manageableGuilds.indexOf(a.id) > -1).map((g, i) => {
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
                                <ContextMenuProvider key={i} id={`ContextMenu-${g.id}`} event='onClick' data={g} component='a' className='server-tile' style={style}>
                                    <ManageContextMenu />
                                    {/* <div className='server-name'>{g.name}</div> */}
                                </ContextMenuProvider>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }
}

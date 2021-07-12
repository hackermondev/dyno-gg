import React from 'react';
import Setting from './Setting.jsx';
import SettingCheckbox from '../common/SettingCheckbox.jsx';
import RichSettingSelect from '../common/RichSettingSelect.jsx';
import RichMultiSelect from '../common/RichMultiSelect.jsx';
import RichNumber from '../common/RichNumber.jsx';
import { updateModuleSetting, updateSetting } from '../service/dashboardService.js';
import '!style-loader!css-loader!./styles/actionlog.css';

export default class SettingsTab extends React.Component {
    state = {
        selectChannel: false,
        ignoredChannels: [],
        channel: false,
        newAccThreshold: 0
    }

    componentDidMount() {
        this.setState({
            selectChannel: this.props.actionlog.selectChannel || false,
            ignoredChannels: this.props.actionlog.ignoredChannels || [],
            channel: this.props.actionlog.channel || false,
            newAccThreshold: this.props.newAccThreshold || 3,
        });
    }

    componentWillReceiveProps(props) {
        this.setState({
            selectChannel: props.actionlog.selectChannel || false,
            ignoredChannels: props.actionlog.ignoredChannels || [],
            channel: props.actionlog.channel || false,
            newAccThreshold: props.newAccThreshold || 3,
        });
    }

    onChange = (identifier, isEnabled) => {
        this.setState({ selectChannel: isEnabled });
    }

    handleIgnoredChannels = (props, selectedOptions) => {
        const ignoredChannels = selectedOptions.map(o => ({ id: o.value, name: o.label }));
        updateModuleSetting(props.module, 'ignoredChannels', ignoredChannels, 'Ignored Channels');
        this.setState({ ignoredChannels });
    }

    newAccThiccness = (item) => {
        updateSetting('newAccThreshold', item);
        this.setState({ newAccThreshold: item });
    }

    handleLogChannel = (props, selectedOption) => {
        this.setState({ channel: selectedOption.value || false });
    }

    render() {
        const module = this.props.data.module;
        const actionlog = this.props.actionlog;
        const newAccThreshold = this.state.newAccThreshold;
        const channels = this.props.channels.filter(c => c.type === 0);

        const channelOptions = channels.map(c => ({ value: c.id, label: c.name }));
        const defaultChannel = channels.find(c => c.id === actionlog.channel);
        const ignoredChannels = channels.filter(c => c.type === 0 && this.state.ignoredChannels.find(i => i.id === c.id));

        return (<div id="actionlog-settings">
            <div className='settings-content is-flex'>
                <SettingCheckbox module={module} setting='selectChannel'
                    friendlyName='Select Channels'
                    defaultValue={this.state.selectChannel}
                    text='Specify Channels for Each Event'
                    helpText='When this option is on, every event can have its own log channel. When it is off, all events will go in the same log channel.'
                    onChange={this.onChange} />
                <SettingCheckbox module={module} setting='showThumb'
                    defaultValue={actionlog.showThumb ? true : false}
                    friendlyName='Show Avatar'
                    helpText={"Shows the user avatar along the 'Member Joined' and 'Member Left' messages."}
                    text='Show Avatar on Join/Leave' />
                <RichNumber
                    min={1}
                    max={30}
                    label='New Account Age (days)'
                    defaultValue={newAccThreshold || 3}
                    onClick={this.newAccThiccness} />
            </div>
            {!this.state.selectChannel ? (
                <div className='settings-content'>
                    <h3 className='title is-5'>Log Channel</h3>
                    <p>Where the events selected below will be posted.</p>
                    <RichSettingSelect
                        module={module}
                        setting='channel'
                        friendlyName='Log Channel'
                        text='Log Channel'
                        defaultValue={defaultChannel}
                        defaultOption='Select Channel'
                        options={channelOptions}
                        onChange={this.handleLogChannel} />
                </div>
            ) : ''}
            {/* <div className='settings-content'>
			</div> */}
            <div className='actionlog-toggles'>
                <h3 className='title is-5'>Events</h3>
                <p>Choose which events will be logged.</p>
                <Setting module={module} setting='guildMemberAdd'
                    isEnabled={actionlog.guildMemberAdd ? true : false}
                    value={typeof actionlog.guildMemberAdd === 'boolean' ? defaultChannel : channels.find(c => c.id === actionlog.guildMemberAdd)}
                    text='Member Joined'
                    selectChannel={this.state.selectChannel}
                    options={channels} />
                <Setting module={module} setting='guildMemberRemove'
                    isEnabled={actionlog.guildMemberRemove ? true : false}
                    value={typeof actionlog.guildMemberRemove === 'boolean' ? defaultChannel : channels.find(c => c.id === actionlog.guildMemberRemove)}
                    text='Member Left'
                    selectChannel={this.state.selectChannel}
                    options={channels} />
                <Setting module={module} setting='guildBanAdd'
                    isEnabled={actionlog.guildBanAdd ? true : false}
                    value={typeof actionlog.guildBanAdd === 'boolean' ? defaultChannel : channels.find(c => c.id === actionlog.guildBanAdd)}
                    text='Member Banned'
                    selectChannel={this.state.selectChannel}
                    options={channels} />
                <Setting module={module} setting='guildBanRemove'
                    isEnabled={actionlog.guildBanRemove ? true : false}
                    value={typeof actionlog.guildBanRemove === 'boolean' ? defaultChannel : channels.find(c => c.id === actionlog.guildBanRemove)}
                    text='Member Unbanned'
                    selectChannel={this.state.selectChannel}
                    options={channels} />
                <Setting module={module} setting='messageEdit'
                    isEnabled={actionlog.messageEdit ? true : false}
                    value={typeof actionlog.messageEdit === 'boolean' ? defaultChannel : channels.find(c => c.id === actionlog.messageEdit)}
                    text='Message Edited'
                    selectChannel={this.state.selectChannel}
                    options={channels} />
                <Setting module={module} setting='messageDelete'
                    isEnabled={actionlog.messageDelete ? true : false}
                    value={typeof actionlog.messageDelete === 'boolean' ? defaultChannel : channels.find(c => c.id === actionlog.messageDelete)}
                    text='Message Deleted'
                    selectChannel={this.state.selectChannel}
                    options={channels} />
                <Setting module={module} setting='messageDeleteBulk'
                    isEnabled={actionlog.messageDeleteBulk ? true : false}
                    value={typeof actionlog.messageDeleteBulk === 'boolean' ? defaultChannel : channels.find(c => c.id === actionlog.messageDeleteBulk)}
                    text='Bulk Message Deletion'
                    selectChannel={this.state.selectChannel}
                    options={channels} />
                <Setting module={module} setting='channelCreate'
                    isEnabled={actionlog.channelCreate ? true : false}
                    value={typeof actionlog.channelCreate === 'boolean' ? defaultChannel : channels.find(c => c.id === actionlog.channelCreate)}
                    text='Channel Created'
                    selectChannel={this.state.selectChannel}
                    options={channels} />
                <Setting module={module} setting='channelDelete'
                    isEnabled={actionlog.channelDelete ? true : false}
                    value={typeof actionlog.channelDelete === 'boolean' ? defaultChannel : channels.find(c => c.id === actionlog.channelDelete)}
                    text='Channel Deleted'
                    selectChannel={this.state.selectChannel}
                    options={channels} />
                <Setting module={module} setting='guildRoleCreate'
                    isEnabled={actionlog.guildRoleCreate ? true : false}
                    value={typeof actionlog.guildRoleCreate === 'boolean' ? defaultChannel : channels.find(c => c.id === actionlog.guildRoleCreate)}
                    text='Role Created'
                    selectChannel={this.state.selectChannel}
                    options={channels} />
                <Setting module={module} setting='guildRoleDelete'
                    isEnabled={actionlog.guildRoleDelete ? true : false}
                    value={typeof actionlog.guildRoleDelete === 'boolean' ? defaultChannel : channels.find(c => c.id === actionlog.guildRoleDelete)}
                    text='Role Deleted'
                    selectChannel={this.state.selectChannel}
                    options={channels} />
                <Setting module={module} setting='guildRoleUpdate'
                    isEnabled={actionlog.guildRoleUpdate ? true : false}
                    value={typeof actionlog.guildRoleUpdate === 'boolean' ? defaultChannel : channels.find(c => c.id === actionlog.guildRoleUpdate)}
                    text='Role Updated'
                    selectChannel={this.state.selectChannel}
                    options={channels} />
                <Setting module={module} setting='memberRoleAdd'
                    isEnabled={actionlog.memberRoleAdd ? true : false}
                    value={typeof actionlog.memberRoleAdd === 'boolean' ? defaultChannel : channels.find(c => c.id === actionlog.memberRoleAdd)}
                    text='Role Given'
                    selectChannel={this.state.selectChannel}
                    options={channels} />
                <Setting module={module} setting='memberRoleRemove'
                    isEnabled={actionlog.memberRoleRemove ? true : false}
                    value={typeof actionlog.memberRoleRemove === 'boolean' ? defaultChannel : channels.find(c => c.id === actionlog.memberRoleRemove)}
                    text='Role Removed'
                    selectChannel={this.state.selectChannel}
                    options={channels} />
                <Setting module={module} setting='nickChange'
                    isEnabled={actionlog.nickChange ? true : false}
                    value={typeof actionlog.nickChange === 'boolean' ? defaultChannel : channels.find(c => c.id === actionlog.nickChange)}
                    text='Nickname Changed'
                    selectChannel={this.state.selectChannel}
                    options={channels} />
                <Setting module={module} setting='commands'
                    isEnabled={actionlog.commands ? true : false}
                    value={typeof actionlog.commands === 'boolean' ? defaultChannel : channels.find(c => c.id === actionlog.commands)}
                    text='Moderator Command Used'
                    selectChannel={this.state.selectChannel}
                    helpText='Logs all mod commands that server moderators have used in the server, such as: warn, mute, kick, ban, etc..'
                    options={channels} />
                <Setting module={module} setting='voiceChannelJoin'
                    isEnabled={actionlog.voiceChannelJoin ? true : false}
                    value={typeof actionlog.voiceChannelJoin === 'boolean' ? defaultChannel : channels.find(c => c.id === actionlog.voiceChannelJoin)}
                    text='Member Joined Voice Channel'
                    selectChannel={this.state.selectChannel}
                    options={channels} />
                <Setting module={module} setting='voiceChannelLeave'
                    isEnabled={actionlog.voiceChannelLeave ? true : false}
                    value={typeof actionlog.voiceChannelLeave === 'boolean' ? defaultChannel : channels.find(c => c.id === actionlog.voiceChannelLeave)}
                    text='Member Left Voice Channel'
                    selectChannel={this.state.selectChannel}
                    options={channels} />
                <Setting module={module} setting='voiceChannelSwitch'
                    isEnabled={actionlog.voiceChannelSwitch ? true : false}
                    value={typeof actionlog.voiceChannelSwitch === 'boolean' ? defaultChannel : channels.find(c => c.id === actionlog.voiceChannelSwitch)}
                    text='Member Moved to Voice Channel'
                    selectChannel={this.state.selectChannel}
                    options={channels} />
            </div>
            <div className='settings-content'>
                <h3 className='title is-5'>Ignored Channels</h3>
                <p>Events will not be logged for these channels.</p>
                <RichMultiSelect
                    module={module}
                    setting='ignoredChannels'
                    friendlyName='Ignored Channel'
                    text='Ignored Channels'
                    defaultValue={ignoredChannels}
                    defaultOption='Select Channel'
                    options={channelOptions}
                    onChange={this.handleIgnoredChannels} />
            </div>
        </div>);
    }
}

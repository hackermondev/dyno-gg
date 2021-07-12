import React from 'react';
import ModuleSettings from '../common/ModuleSettings.jsx';
import SettingsTab from './SettingsTab.jsx';

export default class Moderation extends React.Component {
    render() {
		return (<ModuleSettings {...this.props} name='moderation' title='Moderation' isLoading={false}>
			<SettingsTab {...this.props} {...this.props.data} />
		</ModuleSettings>);
    }
}

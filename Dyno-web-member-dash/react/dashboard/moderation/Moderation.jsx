import React from 'react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import ModuleSettings from '../../common/ModuleSettings.jsx';
import SettingsTab from './SettingsTab.jsx';

export default class Moderation extends ModuleSettings {
    render() {
		return (<div id='module-moderation' className='module-content module-settings'>
			<h3 className='title is-4'>Moderation {this.ModuleToggle}</h3>
			<SettingsTab {...this.props} />
		</div>);
    }
}

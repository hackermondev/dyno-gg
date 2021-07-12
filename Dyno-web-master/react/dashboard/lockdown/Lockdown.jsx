import React from 'react';
import ModuleSettings from '../common/ModuleSettings.jsx';
// import SettingsTab from './SettingsTab.jsx';

export default class Lockdown extends React.Component {
	state = {
		lockdowns: [],
		channels: [],
		roles: [],
		isLoading: true,
		isOpen: false,
		index: 0,
	};

	render() {
		let { lockdowns, channels, roles, emojis } = this.state;

		const mappedLockdowns = [...lockdowns].map(m => {
			return Object.assign({}, m, {
				channel: channels.find(c => c.id === m.channel)
			});
		});

		const selectedLockdown = mappedLockdowns[this.state.index - 1];

		return (<ModuleSettings {...this.props} name='lockdown' title='Lockdown' isLoading={false}>
			<Tabs className='cc-tabs' selectedTabClassName='is-active' selectedTabPanelClassName='is-active' selectedIndex={this.state.index} onSelect={this.selectEmbed}>
				<div className='cc-list'>
					<div className={`mobile ${this.state.isOpen ? 'opened' : ''} ${this.state.index === 0 ? 'default' : ''}`}>
						<ul className='dropdown'>
							{this.state.index === 0 ? (
								<li><span className='embed-list-name'><strong>+</strong> New Lockdown</span></li>
									) : (
								<li><span className='embed-list-name'>
									{selectedLockdown.name}
									</span>
									<span className='embed-list-channel'>
										#{(selectedLockdown.channel && selectedLockdown.channel.name) || 'deleted-channel'}
									</span>
								</li>
							)}
						</ul>
						<div className='caret' onClick={() => this.toggleOpened()}></div>
					</div>
					<TabList>
						<Tab className='embed-list-new'>
							<span className='embed-list-name'>
								<strong>+</strong> New Message
							</span>
						</Tab>
						{mappedMessages.map(m => (
							<Tab key={m._id}>
								<span className='embed-list-name'>
									{m.name}
								</span>
								<span className='embed-list-channel'>
									#{(m.channel && m.channel.name) || 'deleted-channel'}
								</span>
							</Tab>
						))}
					</TabList>
				</div>
				<div className='cc-panel'>
					<TabPanel>
						<ReactionRolesPanel {...this.props}
							channels={channels}
							roles={roles}
							emojis={emojis}
							onSave={this.onSave.bind(this)}
							onCancel={this.onCancel.bind(this)}
							getCloned={this.getClonedMessage} />
					</TabPanel>
					{mappedMessages.map(m => (
						<TabPanel key={m.id}>
							<ReactionRolesPanel {...this.props}
								key={m.id}
								channels={channels}
								roles={roles}
								emojis={emojis}
								message={m}
								onSave={this.onSave.bind(this)}
								onDelete={this.onDelete.bind(this)} />
						</TabPanel>
					))}
				</div>
			</Tabs>
		</ModuleSettings>);
    }
}

import React from 'react';
import axios from 'axios';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import ModuleSettings from '../common/ModuleSettings.jsx';
import ReactionRolesPanel from './ReactionRolePanel.jsx';

export default class ReactionRoles extends React.Component {
	state = {
		messages: [],
		channels: [],
		roles: [],
		isLoading: true,
		isOpen: false,
		index: 0,
	};

	async componentWillMount() {
		try {
			let response = await axios.get(`/api/modules/${this.props.match.params.id}/reactionroles`);

			this.setState({
				reactionroles: response.data.reactionroles,
				messages: response.data.reactionroles.messages || [],
				channels: response.data.channels,
                roles: response.data.roles,
                emojis: response.data.emojis,
				isLoading: false,
			});
		} catch (e) {
			this.setState({ error: 'Failed to get data, try again later' });
		}
	}

    toggleOpened() {
		this.setState({
			isOpen: !this.state.isOpen,
		});
	}

	selectEmbed = (index) => {
		this.setState({ index, isOpen: false });
	}

	onSave = (message) => {
		const { messages } = this.state;

		let index = messages.findIndex(m => m.id === message.id);

		if (index > -1) {
			messages[index] = message;
		} else {
			messages.push(message);
			index = messages.length - 1;
		}

		this.setState({ index: index + 1, messages });
	}

	onDelete = (message) => {
		debugger;
		const { messages } = this.state;

		const index = messages.findIndex(m => m.id === message.id);

		if (index > -1) {
			messages.splice(index, 1);
		}

		this.setState({ index: 0, messages });
	}

	onCancel = () => {
		this.setState({ index: 0 });
	}

	render() {
		let { messages, channels, roles, emojis } = this.state;

		const mappedMessages = [...messages].map(m => {
			return Object.assign({}, m, {
				channel: channels.find(c => c.id === m.channel)
			});
		});

		const selectedMessage = mappedMessages[this.state.index - 1];

		return (<ModuleSettings {...this.props} name='reactionroles' title='Reaction Roles' isLoading={this.state.isLoading}>
				<Tabs className='cc-tabs' selectedTabClassName='is-active' selectedTabPanelClassName='is-active' selectedIndex={this.state.index} onSelect={this.selectEmbed}>
					<div className='cc-list'>
						<div className={`mobile ${this.state.isOpen ? 'opened' : ''} ${this.state.index === 0 ? 'default' : ''}`}>
							<ul className='dropdown'>
								{this.state.index === 0 ? (
									<li><span className='embed-list-name'><strong>+</strong> New Embed</span></li>
										) : (
									<li><span className='embed-list-name'>
										{selectedMessage.name}
										</span>
										<span className='embed-list-channel'>
											#{(selectedMessage.channel && selectedMessage.channel.name) || 'deleted-channel'}
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
			</ModuleSettings>
		);
	}
}

import React from 'react';
import axios from 'axios';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import Loader from '../common/Loader.jsx';
import FeatureLocker from '../common/FeatureLocker.jsx';
import MessageEmbed from './MessageEmbed.jsx';
import ModuleSettings from '../common/ModuleSettings.jsx';

export default class MessageEmbedder extends ModuleSettings {
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
			let response = await axios.get(`/api/modules/${this.props.match.params.id}/messageEmbeds`);

			this.setState({
				messages: response.data.messages,
				channels: response.data.channels,
				roles: response.data.roles,
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

		let index = messages.findIndex(m => m._id === message._id);

		if (index > -1) {
			messages[index] = message;
		} else {
			messages.push(message);
			index = messages.length - 1;
		}

		this.setState({ index: index + 1, messages });
	}

	onDelete = (message) => {
		const { messages } = this.state;

		const index = messages.findIndex(m => m._id === message._id);

		if (index > -1) {
			messages.splice(index, 1);
		}

		this.setState({ index: 0, messages });
	}

	onCancel = () => {
		this.setState({ index: 0 });
	}

	render() {
		if (this.state.isLoading) {
			return <Loader />;
		}

		let { messages, channels, roles } = this.state;

		const mappedMessages = [...messages].map(m => {
			return Object.assign({}, m, {
				channel: channels.find(c => c.id === m.channel)
			});
		});

		const selectedMessage = mappedMessages[this.state.index - 1];

		return (
			<FeatureLocker isLocked={!this.props.data.isPremium}>
				<div id='module-messageembedder' className='module-content module-settings'>
					<h3 className='title is-4'>Message Embedder {this.ModuleToggle}</h3>
					<Tabs className='cc-tabs' selectedTabClassName='is-active' selectedTabPanelClassName='is-active' onSelect={this.selectEmbed}>
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
										<strong>+</strong> New Embed
									</span>
									{/* <button className='button is-success'>New Embed</button> */}
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
								<MessageEmbed {...this.props}
									channels={channels}
									roles={roles}
									onSave={this.onSave}
									onCancel={this.onCancel} />
							</TabPanel>
							{mappedMessages.map(m => (
								<TabPanel key={m._id}>
									<MessageEmbed {...this.props}
										channels={channels}
										message={m}
										onSave={this.onSave}
										onDelete={this.onDelete} />
								</TabPanel>
							))}
						</div>
					</Tabs>
				</div>
			</FeatureLocker>
		);
	}
}

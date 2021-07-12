import axios from 'axios';
import moment from 'moment';
import React from 'react';
import Slider from 'rc-slider';
import Loader from '../common/Loader.jsx';
import ModuleSettings from '../common/ModuleSettings.jsx';
import RichSelect from '../common/RichSelect.jsx';
import { addAutomessage, deleteAutomessage } from './service/automessage.js';
import '!style-loader!css-loader!rc-slider/assets/index.css';

export default class Automessage extends ModuleSettings {
	state = {
		channels: [],
		messages: [],
		selectedOption: {},
		interval: '',
		messageContent: '',
		isLoading: true,
	}

	componentWillMount() {
		this.updateState();
	}

	async updateState() {
		try {
			let response = await axios.get(`/api/modules/${this.props.match.params.id}/automessage`);

			this.setState({
				channels: response.data.channels,
				messages: response.data.messages,
				isLoading: false,
			});
		} catch (e) {
			this.setState({ error: 'Failed to get data, try again later' });
		}
	}

	handleChannel = (props, selectedOption) => {
		this.setState({ selectedOption });
	}

	handleInterval = (event) => {
		let value = event.target.value;

		if (value && value.match(/[0-9]/)) {
			if (parseInt(value, 10) < 1) {
				value = '1';
			} else if (parseInt(value, 10) > 72) {
				value = '72';
			}

			this.setState({ interval: value });
		} else if (!value) {
			this.setState({ interval: value });
		}
	}

	handleContent = (event) => {
		const value = event.target.value;

		if (value.length > 1900) {
			return;
		}

		this.setState({ messageContent: value });
	}

	addMessage = async () => {
		let { interval, messageContent, selectedOption } = this.state;

		interval = interval || 1;

		try {
			await addAutomessage({ channel: selectedOption.value, messageContent, interval }, selectedOption.label);
			this.setState({ selectedOption: {}, interval: '', messageContent: '' });
			this.updateState();
		} catch (err) {
			return;
		}
	}

	deleteMessage = async (message, channel) => {
		try {
			const messages = this.state.messages;
			const index = messages.findIndex(p => p._id === message._id);
			if (index > -1) {
				messages.splice(index, 1);
				await deleteAutomessage(message, channel);
				this.setState({ messages });
			}
		} catch (err) {
			return;
		}
	}

    render() {
		if (this.state.isLoading) {
			return <Loader />;
		}

		const channels = this.state.channels.filter(c => c.type === 0);
		const channelOptions = channels.map(c => ({ value: c.id, label: c.name }));

		let messages = this.state.messages || [];
		messages = messages.filter(p => channels.find(c => c.id === p.channel));

		return (<div id='module-automessage' className='module-content module-settings'>
			<h3 className='title is-4'>Auto Message {this.ModuleToggle}</h3>
			<div className='settings-content'>
				<h3 className='title is-5'>About</h3>
				<p>Auto message will automatically post a message to a channel on a set interval.</p>
				<p><strong>Limits for free users:</strong> Interval between 1 hour and 3 days, one auto message per server.</p>
			</div>
			<div className='settings-group'>
				<div className='settings-content is-half'>
					<h3 className='title is-5'>Add Auto Message</h3>
					<RichSelect
						text='Channel'
						defaultValue={this.state.selectedOption}
						defaultOption='Select Channel'
						options={channelOptions}
						onChange={this.handleChannel} />
					<p className='control'>
						<label htmlFor='interval'>Select message interval (hours)</label>
						<input className='input' type='text' placeholder='1' value={this.state.interval} onChange={this.handleInterval} />
					</p>
					<label className='label'>Message</label>
					<p className='control'>
						<textarea className='input' value={this.state.messageContent || ''} onChange={this.handleContent}></textarea>
					</p>
					<p className='control'>
						<a className='button is-info' onClick={this.addMessage}>Add</a>
					</p>
				</div>
				<div className='settings-content is-half'>
					<h3 className='title is-5'>Auto Message List</h3>
					<table className="table is-striped">
						<thead>
							<tr>
								<th>Channel</th>
								<th>Post Interval</th>
								<th>Next Post</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{messages.map(message => {
								const channel = this.state.channels.find(c => c.id === message.channel);
								return (
									<tr key={message._id}>
										<td>{channel.name}</td>
										<td>{message.interval} minutes</td>
										<td>{moment(message.nextPost).format('YYYY-MM-DD HH:mm')}</td>
										<td><a className='button is-danger' onClick={this.deleteMessage.bind(this, message, channel)}>Remove</a></td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>
		</div>);
	}
}

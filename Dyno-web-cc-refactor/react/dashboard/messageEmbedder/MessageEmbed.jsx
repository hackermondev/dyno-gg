import React from 'react';
import { EmbedBuilder } from '../common/Embed';
import { createMessageEmbed, editMessageEmbed, deleteMessageEmbed } from './service/embedService.js';
import RichSelect from '../common/RichSelect.jsx';

export default class MessageEmbed extends React.Component {
	state = {
		message: this.defaultMessage,
		channels: [],
		selectedOption: false,
		isCloned: false,
	};

	get defaultMessage() {
		return {
			guild  : this.props.data.guildId || null,
			channel: false,
			message: false,
			name   : '',
			time   : new Date(),
			embed  : false,
		};
	}

	componentWillMount() {
		let props = { ...this.props };
		if (this.props.getCloned) {
			props.message = this.props.getCloned();
			props.isCloned = true;
		}
		console.log(props);
		this.updateState(props);
	}

	componentWillReceiveProps(props) {
		let message;
		debugger;
		if (!props.messsage && this.state.isCloned) {
			message = this.defaultMessage;
		} else {
			message = props.message || this.state.message || this.defaultMessage
		}
		this.updateState({
			channels: props.channels || this.state.channels,
			message: message,
		});
	}

	updateState(props) {
		let selectedOption = this.state.selectedOption;
		if (props.message && props.message.channel) {
			const channel = props.message.channel;
			selectedOption = { value: channel.id, label: channel.name };
		}

		// const message = props.message || this.defaultMessage;
		const message = Object.assign({}, this.defaultMessage, props.message);

		this.setState({
			channels: props.channels || [],
			roles: props.roles || [],
			selectedOption: selectedOption || false,
			message,
			isCloned: props.isCloned || false,
		});
	}

	handleInput(key, event) {
		const { message } = this.state;
		message[key] = event.target.value;
		this.setState({ message });
	}

	handleChannel = (props, selectedOption) => {
		this.setState({ selectedOption });
	}

	createEmbed = async (embed) => {
		let { message, selectedOption } = this.state;
		message.embed = embed;
		message.channel = selectedOption.value || false;
		try {
			const result = await createMessageEmbed(message);
			message = result.message || message;
			await this.setState({ message });
			if (this.props.onSave) {
				this.props.onSave(message);
			}
		} catch (err) {
			return;
		}
	}

	editEmbed = async (embed) => {
		let { message } = this.state;
		message.embed = embed;
		message.channel = message.channel ? message.channel.id || message.channel : false;
		await this.setState({ message });
		await editMessageEmbed(message);
		if (this.props.onSave) {
			this.props.onSave(message);
		}
	}

	deleteEmbed = async (embed) => {
		let { message } = this.state;
		this.setState({ message: this.defaultMessage, selectedOption: false });
		deleteMessageEmbed(message);
		if (this.props.onDelete) {
			this.props.onDelete(message);
		}
	}

	cancelEmbed = async () => {
		this.setState({ message: this.defaultMessage, selectedOption: false });
		if (this.props.onCancel) {
			this.props.onCancel();
		}
	}

	cloneEmbed = async () => {
		if (this.props.onClone) {
			this.props.onClone(this.state.message);
		}
	}

	render() {
		const { message, roles, selectedOption, isCloned } = this.state;
		const channels = this.state.channels.filter(c => c.type === 0);
		const channelOptions = channels.map(c => ({ value: c.id, label: c.name }));

		const messageChannel = channels.find(c => {
			if (typeof message.channel === 'object') {
				return c.id === message.channel.id;
			} else {
				return c.id === message.channel;
			}
		});

		const channelDisabled = !!(message && message.embed && !isCloned);
		const channelOption = (messageChannel && { value: messageChannel.id, label: messageChannel.name }) || selectedOption;

		const showIcon = (
			<span className='icon is-link'>
				<i className='fa fa-plus-circle'></i>
			</span>
		);

		return (<div className='message-embedder'>
			<div className='settings-content is-flex'>
				<h3 className='title is-5'>Message Settings</h3>
				<div className='control rich-select'>
					<label className='label' htmlFor='author-name'>
						<label className='label'>Name</label>
						<input id='name'
							className='input is-expanded'
							type='text'
							placeholder='Give it a unique name'
							value={message.name || ''}
							onChange={this.handleInput.bind(this, 'name')} />
					</label>
				</div>
				<RichSelect
					text='Channel'
					defaultValue={channelOption}
					defaultOption='Select Channel'
					options={channelOptions}
					disabled={channelDisabled}
					onChange={this.handleChannel} />
			</div>
			<div className='settings-content'>
				<h3 className='title is-5'>Embed</h3>
				{message && message.embed && !isCloned ?
					(<EmbedBuilder
						roles={roles}
						channels={channels}
						embed={message.embed}
						isPremium={this.props.data.isPremium}
						deleteButton={true}
						onSave={this.editEmbed}
						onDelete={this.deleteEmbed}
						onClone={this.cloneEmbed}
						cloneButton={true} />) :
					(<EmbedBuilder
						roles={roles}
						channels={channels}
						embed={(isCloned && message) ? message.embed : -1}
						isPremium={this.props.data.isPremium}
						cancelButton={true}
						onCancel={this.cancelEmbed}
						onSave={this.createEmbed}
						cloneButton={false} />)}
			</div>
		</div>);
	};
}

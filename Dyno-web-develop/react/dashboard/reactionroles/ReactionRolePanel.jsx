import React from 'react';
import axios from 'axios';
import { createReactionRoles, editReactionRoles, deleteReactionRoles } from './service/reactionRolesService.js';
import ReactionSelector from './ReactionSelector.jsx';
import RichSelect from '../common/RichSelect.jsx';
import RichSaveButton from '../common/RichSaveButton.jsx';

export default class ReactionRolesPanel extends React.Component {
	state = {
		reactions: [],
		description: '',
		title: '',
		name: '',
		selectedChannel: false,
		messageId: '',
	};

	UNSAFE_componentWillMount() {
		const msg = this.props.message;

		if (!msg) return;

		const { title, description, name } = msg;

		const channel = msg.channel;
		const channels = this.props.channels.filter(c => c.type === 0);
		const selectedChannel = channels.find(c => channel && c.id === channel.id) || false;

		const reactions = msg.roles.map((r, i) => {
			const emoji = Object.assign({}, r);
			delete emoji.roleId;

			let role = this.props.roles.find((rol) => rol.id === r.roleId);
			if (!role) {
				role = { label: 'Deleted Role', value: null };
			} else {
				role = { label: role.name, value: role.id };
			}

			const description = r.description;
			return { id: i, emoji, role, description };
		});

		this.setState({
			selectedChannel,
			title, name, description,
			reactions,
			messageId: msg.id || '',
		});
	}

	async save() {
		const payload = {
			name: this.state.name,
			title: this.state.title,
			description: this.state.description,
			channel: this.state.selectedChannel.value,
			reactions: this.state.reactions,
		};

		const exists = !!this.state.messageId;

		if (exists) {
			payload.id = this.state.messageId;
		}

		const baseUrl = '/api/server/' + server + '/reactionRoles';
		const url = (exists) ? `${baseUrl}/edit` : `${baseUrl}/create`;
		try {
			const result = await axios.post(url, payload);
			_showSuccess(`Added Reaction Role ${payload.name}`);
			this.setState({ messageId: result.data.message.id });
			this.props.onSave(result.data.message);
		} catch (err) {
			let msg = err.response.data || 'Something went wrong.';
			_showError(msg);
			return false;
		}

		return true;
	}

	async delete() {
		const payload = {
			messageId: this.state.messageId,
		};

		const url = '/api/server/' + server + '/reactionRoles/delete';
		try {
			const result = await axios.post(url, payload);
			_showSuccess(`Deleted Reaction Role ${payload.name}`);
			this.props.onDelete(result.data.message);
		} catch (err) {
			let msg = err.response.data || 'Something went wrong.';
			_showError(msg);
			return false;
		}
	}

	handleDescription(event) {
		this.setState({ description: event.target.value });
	}

	handleName(event) {
		this.setState({ name: event.target.value });
	}

	handleTitle(event) {
		this.setState({ title: event.target.value });
	}

	handleChannel = (props, selectedChannel) => {
		this.setState({ selectedChannel });
	}

	addReaction() {
		const reactions = [...this.state.reactions, { id: this.state.reactions.length > 0 ? this.state.reactions[this.state.reactions.length - 1].id + 1 : 0, emoji: '', role: '' }];
		this.setState({ reactions });
	}

	onEmojiChange(id, emoji) {
		const newReactions = this.state.reactions.map((r) => {
			if (r.id === id) {
				return { id, emoji, role: r.role, description: r.description };
			}
			return r;
		});
		this.setState({ reactions: newReactions });
	}

	onDescriptionChange(id, description) {
		const newReactions = this.state.reactions.map((r) => {
			if (r.id === id) {
				return { id, emoji: r.emoji, role: r.role, description };
			}
			return r;
		});
		this.setState({ reactions: newReactions });
	}

	onRoleChange(id, role) {
		const newReactions = this.state.reactions.map((r) => {
			if (r.id === id) {
				return { id, emoji: r.emoji, role, description: r.description };
			}
			return r;
		});
		this.setState({ reactions: newReactions });
	}

	onDeleteSelector(id) {
		const newReactions = this.state.reactions.filter((r) => r.id !== id);
		this.setState({ reactions: newReactions });
	}

	createEmbed = async (embed) => {
		let { message, selectedChannel } = this.state;
		message.embed = embed;
		message.channel = selectedChannel.value || false;
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

	editReaction = async (embed) => {
		let { message } = this.state;
		message.embed = embed;
		message.channel = message.channel ? message.channel.id || message.channel : false;
		await this.setState({ message });
		await editMessageEmbed(message);
		if (this.props.onSave) {
			this.props.onSave(message);
		}
	}

	deleteReaction = async (embed) => {
		let { message } = this.state;
		this.setState({ message: this.defaultMessage, selectedChannel: false });
		deleteMessageEmbed(message);
		if (this.props.onDelete) {
			this.props.onDelete(message);
		}
	}

	cancelReaction = async () => {
		this.setState({ message: this.defaultMessage, selectedChannel: false });
		if (this.props.onCancel) {
			this.props.onCancel();
		}
	}

	render() {
		const { message, selectedChannel } = this.state;
		const { roles } = this.props;
		const channels = this.props.channels.filter(c => c.type === 0);
		const channelOptions = channels.map(c => ({ value: c.id, label: c.name }));

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
							value={this.state.name}
							onChange={this.handleName.bind(this)} />
					</label>
				</div>
				<RichSelect
					text='Channel'
					defaultValue={this.state.selectedChannel}
					defaultOption='Select Channel'
					options={channelOptions}
					disabled={false}
					onChange={this.handleChannel.bind(this)} />
				<div className='control'>
					<label className='label'>Title</label>
					<input id='name'
						className='input is-expanded'
						type='text'
						placeholder='Give it a nice title'
						value={this.state.title}
						onChange={this.handleTitle.bind(this)} />
					<label className='label'>Description</label>
					<textarea
						className='input'
						name='description'
						onChange={this.handleDescription.bind(this)}
						value={this.state.description}
						maxLength={200}
					/>
				</div>
			</div>
			<div className='settings-content'>
				<h3 className='title is-5'>Message</h3>

				{this.state.reactions.map((r, i) => (
					<ReactionSelector
						emojis={this.props.emojis}
						roles={this.props.roles}
						emoji={r.emoji}
						role={r.role}
						description={r.description}
						onEmojiChange={this.onEmojiChange.bind(this)}
						onDescriptionChange={this.onDescriptionChange.bind(this)}
						onRoleChange={this.onRoleChange.bind(this)}
						onDelete={this.onDeleteSelector.bind(this)}
						id={r.id}
						key={r.id}
					/>
				))}
				<button className='button is-info is-outlined' onClick={this.addReaction.bind(this)}>
					<i class="fas fa-plus"></i>
				</button>
				<div className='control' style={{ marginTop: '30px' }}>
					{/* <button className='button is-info' onClick={this.save.bind(this)}>Save</button> */}
					<RichSaveButton onClick={this.save.bind(this)} />
					{ this.state.messageId &&
						<button className='button is-danger' onClick={this.delete.bind(this)}>Delete</button>
					}
				</div>

			</div>
		</div >);
	};
}

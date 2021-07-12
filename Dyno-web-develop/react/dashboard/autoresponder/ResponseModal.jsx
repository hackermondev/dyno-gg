import React from 'react';
import axios from 'axios';
import '!style-loader!css-loader!@dyno.gg/emoji-mart/css/emoji-mart.css';
import { Picker } from '@dyno.gg/emoji-mart';
import Emoji from '@dyno.gg/emoji-mart/dist/components/emoji/emoji.js';
import RichCheckbox from '../common/RichCheckbox.jsx';
import RichMultiSelect from '../common/RichMultiSelect.jsx';
import RichSelect from '../common/RichSelect.jsx';
import Variables from '../common/Variables.jsx';
import Help from '../common/Help.jsx';

export default class ResponseModal extends React.Component {
	state = {
		channels: [],
		formData: this.defaultFormData,
		isPickerOpen: false,
		contentChars: 0,
		contentLimit: false,
		nameChars: 0,
		nameLimit: false,
	}

	get defaultFormData() {
		return {
			command: '',
			response: '',
			type: 'message',
			allowedChannels: [],
			ignoredChannels: [],
			reactions: [],
			wildcard: false,
		};
	}

	async UNSAFE_componentWillMount() {
		this.setState({
			channels: this.props.channels || [],
			emojis: this.props.emojis || [],
			formData: this.props.command ? this.props.command : this.defaultFormData,
		});
	}

	async UNSAFE_componentWillReceiveProps(props) {
		this.setState({
			channels: props.channels || [],
			emojis: props.emojis || [],
			formData: props.command ? props.command : this.defaultFormData,
		});
	}

	setFormData(key, val) {
		const formData = this.state.formData;
		formData[key] = val;
		return this.setState({ 
			formData, 
			contentChars: formData.response.length, 
			nameChars: formData.command.length
		});
	}

	handleInput(type, event) {
		if (type == 'response') {
			var input = event.target.value;
			this.setState({
				contentChars: input.length
			});
			if (input.length >= 2000) {
				this.setState({
					contentLimit: true
				});
			}
			else {
				this.setState({
					contentLimit: false
				})
			}
		}
		this.setFormData(type, event.target.value);
	}

	handleCommandName = (event) => {
		let value = event.target.value;

		if (value.length > 72) {
			return;
		}
		this.setState({
			nameChars: value.length
		});
		if (value.length >= 72) {
			this.setState({
				nameChars: 72,
				nameLimit: true
			});
		}
		else {
			this.setState({
				nameLimit: false
			})
		}
		this.setFormData('command', event.target.value);
	}

	handleMultiSelect(type, props, selectedOptions) {
		this.setFormData(type, selectedOptions.map(o => ({ id: o.value, name: o.label })));
	}

	handleCheckbox(type, identifier, isEnabled) {
		this.setFormData(type, isEnabled);
	}

	addReaction = (emoji) => {
		if (emoji.custom) {
			const customEmoji = this.state.emojis.find(e => e.name === emoji.name);
			emoji._id = customEmoji.id;
		}

		const { formData } = this.state;
		formData.reactions = formData.reactions || [];
		formData.reactions.push(emoji);

		this.setState({ formData, isPickerOpen: false });
	}

	deleteReaction(reaction) {
		const { formData } = this.state;
		const index = formData.reactions.findIndex(r => r.id === reaction.id);
		formData.reactions.splice(index, 1);

		this.setState({ formData });
	}

	addHandler = () => {
		const command = this.state.formData;
        const url = `/api/server/${this.props.match.params.id}/autoresponder/create`;
        const data = { command };

        // Max length
        if (command.command.length > 72) return _showError('Command name cannot be over 72 characters.');
        if (command.response.length > 2000) return _showError('Respones cannot be over 2,000 characters.');

		const test = command.response.replace(/ *\{[^)]*\} */g, '');
		if (test.length > 2000) return _showError('Response cannot be over 2,000 characters.');

        axios.post(url, data).then((res) => {
            if (res.status === 200) {
                _showSuccess(`Added Response ${command.command}`);

				try {
					this.props.onClose(command);
				} catch (err) {
					return;
				}
            } else {
                _showError('An error occurred.');
            }
		}).catch((err) => {
			_showError('Something went wrong.');
        });
	}

    saveHandler = () => {
        const command = this.state.formData;
        const url = `/api/server/${this.props.match.params.id}/autoresponder/edit`;
        const data = { command };

        if (command.response.length > 2000) return _showError('Respones cannot be over 2,000 characters.');

		const test = command.response.replace(/ *\{[^)]*\} */g, '');
		if (test.length > 2000) return _showError('Response cannot be over 2,000 characters.');

        axios.post(url, data).then((res) => {
            if (res.status === 200) {
                _showSuccess(`Updated Response ${command.command}`);

                this.props.onClose(command);
            } else {
                _showError('An error occurred.');
            }
        }).catch((err) => {
            if (err) {
                _showError('Something went wrong.');
            }
        });
	}

	togglePicker = () => {
		this.setState({ isPickerOpen: !this.state.isPickerOpen });
	}

    render() {
		const { formData } = this.state;
		const disableName = !!this.props.command;

		let channels = this.state.channels.filter(c => (c.type === 0 || c.type === 4));

		const channelOptions = channels.map(c => ({ value: c.id, label: c.name }));

		let allowedChannels = this.state.formData.allowedChannels || [];
		let ignoredChannels = this.state.formData.ignoredChannels || [];

		allowedChannels = channels.filter(c => allowedChannels.find(i => i.id === c.id));
		ignoredChannels = channels.filter(c => ignoredChannels.find(i => i.id === c.id));

		const customs = this.state.emojis.map(emoji => {
			return {
				name: emoji.name,
				short_names: [emoji.name],
				imageUrl: `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}?v=1`,
			};
		});

		// const { reactions } = formData;
		// reactions = reactions.map(r => {
		// 	// r.imageUrl = `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}?v=1`,
		// })

		const canAddReactions = !formData.reactions || formData.reactions.length < 3;

		const categories = [
			'search',
			'recent',
			'custom',
			'people',
			'nature',
			'foods',
			'activity',
			'places',
			'objects',
			'symbols',
			'flags',
		];

		const contentClass = this.state.contentLimit ? "over2k" : "";
		const nameClass = this.state.nameLimit ? "over2k" : "";

		return (<div className='settings-content'>
			<div className='cc-add'>
				<h3 className='title is-5'>{this.props.command ? 'Edit' : 'Add'} Response</h3>
				<label className='label'>Command - <span className={nameClass}>{this.state.nameChars}</span> Character{this.state.nameChars == 1 ? '' : 's'}</label>
				<p className='cc-name control'>
					<input className='input' type='text' value={formData.command} disabled={disableName} onChange={this.handleCommandName} />
				</p>
				<p className='control'>
					<input id='messageType' className='radio'
						type='radio'
						name='type'
						value='message'
						onChange={this.handleInput.bind(this, 'type')}
						checked={formData.type === 'message'} />
					<label htmlFor='messageType'>
						Message Response
					</label>
					<Help text='Auto responds with a message.' />
					<input id='reactionType' className='radio'
						type='radio'
						name='type'
						value='reaction'
						onChange={this.handleInput.bind(this, 'type')}
						checked={formData.type === 'reaction'} />
					<label htmlFor='reactionType'>
						Reaction Response
					</label>
					<Help text='Auto responds by adding a reaction to the message. Note: Dyno requires the "Add Reactions" permission to be able to do this.' />
				</p>
				{formData.type === 'message' && (
					<p className='control'>
						<label className='label'>Response - <span className={contentClass}>{this.state.contentChars}</span> Character{this.state.contentChars == 1 ? '' : 's'}</label> {/*-  */}
						<textarea className='input cc-response' name="response" value={formData.response} onChange={this.handleInput.bind(this, 'response')}></textarea>
					</p>
				)}
				{formData.type === 'reaction' && (
					<div className='reaction-picker'>
						{formData.reactions && formData.reactions.map(reaction => (
							<div key={reaction.id} className='reaction'>
								{reaction.custom ?
									<span className='custom' style={{
										background: `url(${reaction.imageUrl}) no-repeat center`,
										backgroundSize: `20px`,
									}}></span> :
									<Emoji set='twitter' sheetSize={64} emoji={reaction.colons} />
								}
								<a className='icon delete-reaction' onClick={this.deleteReaction.bind(this, reaction)}>
									<i className='fa fa-times'></i>
								</a>
							</div>
						))}
						{canAddReactions && (
							<div className='reaction'>
								<a className='is-info' onClick={this.togglePicker}>+</a>
							</div>
						)}
						{this.state.isPickerOpen && (
							<Picker
								set='twitter'
								title='Pick an emoji'
								custom={customs}
								include={categories}
								showPreview={false}
								// emojiTooltip={true}
								onClick={this.addReaction} />
						)}
					</div>
				)}
				<RichMultiSelect
					module={module}
					setting='allowedChannels'
					friendlyName='Allowed Channel'
					label='Allowed Channels'
					placeholder='Allowed Channels'
					defaultValue={allowedChannels}
					options={channelOptions}
					helpText='Dyno will only respond in these channels.'
					onChange={this.handleMultiSelect.bind(this, 'allowedChannels')} />
				<RichMultiSelect
					module={module}
					setting='ignoredChannels'
					friendlyName='Ignored Channel'
					label='Ignored Channels'
					placeholder='Ignored Channels'
					defaultValue={ignoredChannels}
					options={channelOptions}
					helpText='Dyno will not respond in these channels.'
					onChange={this.handleMultiSelect.bind(this, 'ignoredChannels')} />
				<RichCheckbox
					text='Wildcard'
					onChange={this.handleCheckbox.bind(this, 'wildcard')}
					helpText='Auto responder will search for the command anywhere in the message.'
					defaultValue={formData.wildcard} />
				<div className='control'>
					<Variables />
				</div>
				{this.props.command ? (
					<div className='cc-buttons'>
						<span className='control'>
							<a className='button edit-command is-info' onClick={this.saveHandler}>Save Response</a>
						</span>
					</div>
				) : (
					<div className='cc-buttons'>
						<span className='control'>
							<a className='button add-command is-info' onClick={this.addHandler}>Add Response</a>
						</span>
					</div>
				)}
			</div>
		</div>);
    }
}

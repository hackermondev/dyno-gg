import axios from 'axios';
import React from 'react';
import Modal from 'react-responsive-modal';
import RichSelect from '../common/RichSelect.jsx';
import { Picker } from '@dyno.gg/emoji-mart';
import { postEmoji } from './service/sandboxService.js';

export default class Sandbox extends React.Component {
	state = {
		channels: [],
		emojis: [],
		roles: [],
		isLoading: true,
		emojiChannel: false,
	}

	async componentWillMount() {
		try {
			let response = await axios.get(`/api/modules/${this.props.match.params.id}/sandbox`);

			this.setState({
				channels: response.data.channels || [],
				emojis: response.data.emojis || [],
				roles: response.data.roles || [],
				isLoading: false,
			});
		} catch (e) {
			this.setState({ error: 'Failed to get data, try again later' });
		}
	}

	handleEmojiChannel = (props, selectedOption) => {
		console.log(selectedOption);
		this.setState({ emojiChannel: selectedOption });
	}

	postEmoji = (emoji) => {
		if (emoji.custom) {
			const customEmoji = this.state.emojis.find(e => e.name === emoji.name);
			emoji._id = customEmoji.id;
			emoji.animated = customEmoji.animated;
		}

		if (!this.state.emojiChannel) {
			console.log('No emoji channel');
			return;
		}

		console.log(emoji);
		postEmoji(this.state.emojiChannel, emoji);
	}

	togglePicker = () => {
		this.setState({ isPickerOpen: !this.state.isPickerOpen });
	}

	render() {
		const { channels } = this.state;
		const channelOptions = channels.filter(c => c.type === 0).map(c => ({ value: c.id, label: c.name }));

		const customs = this.state.emojis.map(emoji => {
			return {
				name: emoji.name,
				short_names: [emoji.name],
				imageUrl: `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}`,
			};
		});

		const customa = [
			{ name: 'lancewirl', short_names: ['lancewirl'], imageUrl: 'https://cdn.discordapp.com/emojis/590157115784691712.gif?v=1' },
		];

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

		return (
			<div>
				<RichSelect
					text='Emoji Channel'
					defaultValue={this.state.emojiChannel}
					defaultOption='Emoji Channel'
					options={channelOptions}
					onChange={this.handleEmojiChannel} />
				<div className='reaction'>
					<a className='is-info' onClick={this.togglePicker}>+</a>
				</div>
				{this.state.isPickerOpen && (
					<Picker
						set='twitter'
						title='Pick an emoji'
						custom={customs}
						// darkMode={true}
						include={categories}
						showPreview={false}
						// emojiTooltip={true}
						onClick={this.postEmoji} />
				)}
			</div>
		)
	}
}
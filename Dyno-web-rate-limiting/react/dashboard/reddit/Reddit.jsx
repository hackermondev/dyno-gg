import axios from 'axios';
import React from 'react';
import { Creatable } from 'react-select';
import ModuleSettings from '../common/ModuleSettings.jsx';
import RichSelect from '../common/RichSelect.jsx';
import RichCheckbox from '../common/RichCheckbox.jsx';
import { addSubreddit, removeSubreddit } from './service/redditservice.js';
import '!style-loader!css-loader!rc-slider/assets/index.css';

export default class Reddit extends React.Component {
	state = {
		channels: [],
		subscriptions: [],
		selectedOption: {},
		selectedFlair: [],
		selectedType: {},
		subreddit: '',
		includeNsfw: false,
		onlyNsfw: false,
		blurNsfw: true,
		noImages: false,
		isLoading: true,
	}

	componentWillMount() {
		this.updateState();
	}

	async updateState() {
		try {
			let response = await axios.get(`/api/modules/${this.props.match.params.id}/reddit`);

			this.setState({
				channels: response.data.channels,
				subscriptions: response.data.subscriptions,
				isLoading: false,
			});
		} catch (e) {
			this.setState({ error: 'Failed to get data, try again later' });
		}
	}

	handleChannel = (props, selectedOption) => {
		this.setState({ selectedOption });
	}

	handleType = (props, selectedType) => {
		this.setState({ selectedType });
	}

	handleSubreddit = (event) => {
		const value = event.target.value;
		this.setState({ subreddit: value });
	}

	handleFlair = (selectedFlair) => {
		selectedFlair = selectedFlair.map(o => ({ value: o.value, label: o.label }));
		this.setState({ selectedFlair });
	}

	handleCheckbox(type, identifier, isEnabled) {
		const state = {};

		if (type === 'includeNsfw') {
			this.handleNsfw(isEnabled);
		}

		state[type] = isEnabled;
		this.setState(state);
	}

	handleNsfw(isEnabled) {
		const { channels, selectedOption } = this.state;
		const channel = channels.find(c => c.id === selectedOption.value);
		if (!channel) {
			return;
		}
		if (isEnabled && !channel.nsfw) {
			this.setState({ selectedOption: {} });
		}
	}

	addMessage = async () => {
		let { subreddit, selectedType, selectedOption, selectedFlair, blurNsfw, noImages, includeNsfw } = this.state;

		subreddit = subreddit.replace(/(?:https?:\/\/)?(?:(?:reddit.com|redd.it)\/)?(?:r\/)?([a-zA-Z0-9\-\_]+)/, '$1');

		try {
			const flair = selectedFlair.map(f => f.value);
			const success = await addSubreddit({ channel: selectedOption.value, flair, subreddit, messageType: selectedType.value, blurNsfw, noImages, includeNsfw });

			if (!success) return;

			this.setState({ subreddit: '' });
			this.updateState();
		} catch (err) {
			return;
		}
	}

	deleteMessage = async (subscription) => {
		try {
			const subscriptions = this.state.subscriptions;
			const index = subscriptions.findIndex(p => p._id === subscription._id);
			if (index > -1) {
				const success = await removeSubreddit(subscription);

				if (!success) return;
				subscriptions.splice(index, 1);
				this.setState({ subscriptions });
			}
		} catch (err) {
			return;
		}
	}

	render() {
		const channels = this.state.channels.filter(c => c.type === 0);
		const channelOptions = this.state.includeNsfw ? 
			channels.filter(c => c.type === 0 && c.nsfw).map(c => ({ value: c.id, label: c.name })) :
			channels.map(c => ({ value: c.id, label: c.name }));

		let subscriptions = this.state.subscriptions || [];
		subscriptions = subscriptions.filter(p => channels.find(c => c.id === p.channelId));


		let messageTypes = [
			{
				value: 'simple',
				label: 'Simple',
			},
			{
				value: 'embed',
				label: 'Embed',
			},
		];

		return (<ModuleSettings {...this.props} name='reddit' title='Reddit' isLoading={this.state.isLoading}>
			<div className='settings-panel'>
				<div className='settings-content'>
					<h3 className='title is-5'>About</h3>
					<p>Subscribe to a subreddit to receive new posts as a discord message.</p>
					<p>The simple message will attach videos while the embed message type looks prettier but requires you to browse to the video link to watch it.</p>
				</div>
				<div className='settings-group'>
					<div className="columns">
						<div className="column is-4">
							<div className='settings-content'>
								<h3 className='title is-5'>Subscribe to subreddit</h3>
								<RichSelect
									text='Channel to post'
									defaultValue={this.state.selectedOption}
									defaultOption='Select Channel'
									options={channelOptions}
									onChange={this.handleChannel} />
								<p className='control'>
									<label htmlFor='interval'>Subreddit</label>
									<input className='input' type='text' placeholder='funny' value={this.state.subreddit} onChange={this.handleSubreddit} />
								</p>
								<RichSelect
									text='Message type'
									defaultValue={this.state.selectedType}
									defaultOption="Select type"
									options={messageTypes}
									onChange={this.handleType} />
								<div className='control'>
									<label className='label'>Filter by Flair (optional)</label>
									<Creatable
										multi={true}
										arrowRenderer={null}
										placeholder='Flair'
										clearable={this.props.clearable}
										onChange={this.handleFlair}
										createable={true}
										searchable={true}
										noResultsText=''
										value={this.state.selectedFlair} />
								</div>
								<RichCheckbox
									text='Show Images'
									onChange={this.handleCheckbox.bind(this, 'noImages')}
									helpText='If checked, image previews will be posted.'
									defaultValue={!this.state.noImages} />
								<RichCheckbox
									text='Include NSFW'
									onChange={this.handleCheckbox.bind(this, 'includeNsfw')}
									helpText='If checked, posts tagged as NSFW will be posted.'
									defaultValue={this.state.includeNsfw} />
								{/* <RichCheckbox
									text='Blur NSFW'
									onChange={this.handleCheckbox.bind(this, 'blurNsfw')}
									helpText='If checked, posts tagged as NSFW will be blurred.'
									defaultValue={this.state.blurNsfw} /> */}
								<p className='control'>
									<a className='button is-info' onClick={this.addMessage}>Add</a>
								</p>
							</div>
						</div>
						<div className="column is-8">
							<div className='settings-content'>
								<h3 className='title is-5'>Subscription List</h3>
								<table className="table is-striped">
									<thead>
										<tr>
											<th>Channel</th>
											<th>Subreddit</th>
											<th>Type</th>
											<th>Flair</th>
											<th>NSFW</th>
											<th>Show Images</th>
											<th></th>
										</tr>
									</thead>
									<tbody>
										{subscriptions.map(sub => {
											const channel = this.state.channels.find(c => c.id === sub.channelId);
											return (
												<tr key={sub._id}>
													<td>#{channel.name}</td>
													<td>{sub.subredditOriginal || sub.subreddit}</td>
													<td>{sub.messageType}</td>
													<td>{sub.flair ? sub.flair.join(', ') : ''}</td>
													<td>{sub.includeNsfw ? 'Yes' : 'No'}</td>
													<td>{!sub.noImages ? 'Yes' : 'No'}</td>
													<td><a className='button is-info' onClick={this.deleteMessage.bind(this, sub)}>Remove</a></td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				</div>
			</div>
		</ModuleSettings>);
	}
}

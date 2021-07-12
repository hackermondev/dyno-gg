/* eslint-disable no-invalid-this */
import axios from 'axios';
import React from 'react';
import Loader from '../common/Loader.jsx';
import Help from '../common/Help.jsx';
import List from '../../serverListing/List.jsx';
import SketchPicker from 'react-color';
import Dropzone from 'react-dropzone';
import RichMultiSelect from '../common/RichMultiSelect.jsx';
import RichSelect from '../common/RichSelect.jsx';
import { Creatable } from 'react-select';
import '!style-loader!css-loader!rc-slider/assets/index.css';


export default class ServerListing extends React.Component {
	state = {
		serverInfo: {},
		originalServerInfo: {},
		backgroundRegularFile: {},
		backgroundFeaturedFile: {},
		categories: [],
		isLoading: true,
		isSaving: false,
		justSaved: false,
		selectedInviteChannel: {},
		channels: [],
	};

	componentWillMount() {
		this.fetchServerInfo();
	}

	fetchServerInfo = async () => {
		try {
			let response = await axios.get(`/api/server/${this.props.match.params.id}/serverlisting/`);

			let defaultInviteChannel = {};

			if (response.data.server.defaultInviteChannel) {
				const channel = response.data.channels.find((c) => c.id === response.data.server.defaultInviteChannel);
				if (channel) {
					defaultInviteChannel = { label: channel.name, value: channel.id };
				}
			}

			this.setState({
				serverInfo: response.data.server,
				originalServerInfo: response.data.server,
				categories: response.data.categories,
				isLoading: false,
				channels: response.data.channels,
				selectedInviteChannel: defaultInviteChannel,
			});
		} catch (e) {
			this.setState({ error: 'Failed to get data, try again later' });
		}
	}

	updateServerInfoState = (propName, propValue) => {
		const stateObj = Object.assign({}, this.state.serverInfo, {
			[propName]: propValue,
		});

		this.setState({
			serverInfo: stateObj,
		});
	}

	handleInputChange = (event) => {
		const target = event.target;
		const value = target.type === 'checkbox' ? target.checked : target.value;
		const name = target.name;

		this.updateServerInfoState(name, value);
	}

	handleLinkChange = (event, type) => {
		const value = event.target.value;
		const links = this.state.serverInfo.links;

		let newLinks;
		if (!links) {
			newLinks = [{ type, url: value }];
		} else {
			newLinks = links.slice(0).filter((l) => l.type !== type);

			if (value) {
				newLinks.push({ type, url: value });
			}
		}

		this.updateServerInfoState('links', newLinks);
	}

	getLinkUrl = (type) => {
		if (!this.state.serverInfo.links) return;

		const link = this.state.serverInfo.links.find((l) => l.type === type) || {};

		return link.url || '';
	}

	handleColorChange = (color) => {
		this.updateServerInfoState('borderColor', color.hex);
	}

	toggleColorPicker = () => {
		this.setState({ displayColorPicker: !this.state.displayColorPicker });
	};

	handleDropFeatured = ([file]) => {
		const stateObj = Object.assign({}, this.state.serverInfo, {
			backgroundImageVertical: file.preview,
		});

		this.setState({
			backgroundFeaturedFile: file,
			serverInfo: stateObj,
		});
	}

	handleDropRegular = ([file]) => {
		const stateObj = Object.assign({}, this.state.serverInfo, {
			backgroundImage: file.preview,
		});

		this.setState({
			backgroundRegularFile: file,
			serverInfo: stateObj,
		});
	}

	onChangeListed = () => {
		this.updateServerInfoState('listed', !this.state.serverInfo.listed);
	}

	handleSave = async (e) => {
		try {
			const formData = new FormData();

			formData.append('inviteUrl', this.state.serverInfo.inviteUrl);
			// formData.append('borderColor', this.state.serverInfo.borderColor);
			formData.append('backgroundImageFile', this.state.backgroundRegularFile);
			formData.append('backgroundImageVerticalFile', this.state.backgroundFeaturedFile);
			formData.append('description', this.state.serverInfo.description);
			formData.append('listed', this.state.serverInfo.listed);
			formData.append('defaultInviteChannel', this.state.selectedInviteChannel.value);
			formData.append('tags', JSON.stringify(this.state.serverInfo.tags || []));
			formData.append('categories', JSON.stringify(this.state.serverInfo.categories || []));
			formData.append('links', JSON.stringify(this.state.serverInfo.links || []));

			this.setState({ isSaving: true });
			const url = `/api/server/${server}/serverlisting/update`;
			await axios.post(url, formData);

			await this.fetchServerInfo();

			this.setState({ isSaving: false, justSaved: true });

			setTimeout(() => {
				this.setState({ justSaved: false });
			}, 3000);
		} catch (err) {
			this.setState({ isSaving: false });
			if (err.response && err.response.data) {
				return _showError(err.response.data);
			}

			return _showError(err);
		}
	}

	resetForm = () => {
		const originalClone = Object.assign({}, this.state.originalServerInfo);
		this.setState({
			serverInfo: originalClone,
		});
	}

	deleteImageVertical = () => {
		const stateObj = Object.assign({}, this.state.serverInfo, {
			backgroundImageVertical: undefined,
		});

		this.setState({
			backgroundFeaturedFile: undefined,
			serverInfo: stateObj,
		});
	}

	deleteImageRegular = () => {
		const stateObj = Object.assign({}, this.state.serverInfo, {
			backgroundImage: undefined,
		});

		this.setState({
			backgroundRegularFile: undefined,
			serverInfo: stateObj,
		});
	}

	handleCategories = (props, selectedOptions) => {
		const categories = selectedOptions.map(o => o.value);
		this.updateServerInfoState('categories', categories);
	}

	handleTags = (newValue) => {
		const tags = newValue.map((val) => {
			return val.value;
		});

		this.updateServerInfoState('tags', tags);
	}

	handleChannel = (props, selectedInviteChannel) => {
		this.setState({ selectedInviteChannel });
	}

	render() {
		if (this.state.isLoading) {
			return <Loader />;
		}

		const colorStyle = {
			backgroundColor: this.state.serverInfo.borderColor || '#202020',
		};

		const popover = {
			position: 'absolute',
			zIndex: '2',
		};

		const cover = {
			position: 'fixed',
			top: '0px',
			right: '0px',
			bottom: '0px',
			left: '0px',
		};

		let saveButton;
		if (!this.state.justSaved) {
			saveButton = (
				<button className='button is-medium is-info is-fullwidth' onClick={this.handleSave}>
					Save
				</button>);
		} else {
			saveButton = (
				<button className='button is-medium is-success is-fullwidth' onClick={this.handleSave} style={{ fontFamily: '"Font Awesome 5 Regular"' }}>
					{/* fa-check glyph */}
					
				</button>);
		}

		if (this.state.isSaving) {
			saveButton = (
				<button className='button is-medium is-info is-loading is-fullwidth' onClick={this.handleSave}>
				</button>);
		}

		let tags = this.state.serverInfo.tags && this.state.serverInfo.tags.map((u) => ({ label: u, value: u }));
		let categories = this.state.categories.map((u) => ({ id: u, name: u }));
		let defaultCategories = this.state.serverInfo.categories && this.state.serverInfo.categories.map((u) => ({ id: u, name: u }));

		const channels = this.state.channels.filter(c => c.type === 0);
		const channelOptions = channels.map(c => ({ value: c.id, label: c.name }));

		return (<div id='module-serverlisting' className='module-content module-settings'>
			<h3 className='title is-4'>Server Listing {this.ModuleToggle}</h3>
			<div className='settings-content'>
				<h3 className='title is-5'>About</h3>
				{/* <p>This panel controls and customizes wether and how this server is listed on our server list, which can be found <a href="/servers/">here</a></p> */}
				<p>This panel controls and customizes whether and how this server is listed on our server list, which will be released shortly.</p>
			</div>
			<div className='settings-group'>
				<div className='settings-content is-half'>
					<h3 className='title is-5'>Listing Details</h3>
					<div className="module-multitext">
						<div className="control module-toggle" onClick={this.onChangeListed}>
							<input
								className=""
								type="checkbox"
								checked={this.state.serverInfo.listed}
								onChange={this.onChangeListed}
							/>
							<label className="checkbox" htmlFor={this.props.text}>
								Listed
							</label>
						</div>
						<p className='control'>
							<label className="label">Description</label>
							<textarea
								className='input'
								name='description'
								onChange={this.handleInputChange}
								value={this.state.serverInfo.description}
								maxLength={200}
							/>
						</p>
					</div>
					<p className='control'>
						<label className="label">Invite URL<Help text={'If empty, Dyno will attempt to create an invite for you. Make sure he has permissions to do so, as the bot will attempt to create an invite if this one ever expires or becomes invalid. This will ensure users will always be able to join your server.'} /></label>
						<input
							type='text'
							name='inviteUrl'
							className='input'
							onChange={this.handleInputChange}
							value={this.state.serverInfo.inviteUrl}
						/>
					</p>
					<RichSelect
						text='Default invite channel'
						defaultValue={this.state.selectedInviteChannel}
						defaultOption='Select Channel'
						options={channelOptions}
						onChange={this.handleChannel}
						helpText={'If Dyno needs to create a new invite, it will use this channel as the invite channel.'} />
					{/* <p className='control'>
						<label className='label'>Border Color</label>
						<a className='button' onClick={this.toggleColorPicker}>Choose Color</a>
						<span className='builder-color-preview' style={colorStyle} onClick={this.toggleColorPicker}></span>
					</p>
					{this.state.displayColorPicker ? <div style={popover}>
						<div style={cover} onClick={this.toggleColorPicker} />
						<SketchPicker
							color={this.state.serverInfo.borderColor}
							onChangeComplete={this.handleColorChange} />
					</div> : null} */}
					<RichMultiSelect
						friendlyName='Categories'
						text='Categories'
						label='Categories'
						defaultValue={defaultCategories}
						defaultOption=''
						options={categories}
						onChange={this.handleCategories} />
					<label className='label'>Tags</label>
					<div className='hide-select-menu control'>
						<Creatable
							multi={true}
							placeholder='Add Tags (press enter to apply)'
							clearable={true}
							onChange={this.handleTags}
							createable={true}
							value={tags}
							menuRenderer={() => false}
							arrowRenderer={null}
						/>
					</div>
					{ (this.state.serverInfo.premium || this.state.serverInfo.featured) &&
						<label className='label'>
							Background Image
							<a onClick={this.deleteImageRegular} style={{ marginLeft: '10px' }}><i className="fas fa-trash-alt" /></a>
						</label>
					}
					{ (this.state.serverInfo.premium || this.state.serverInfo.featured) &&
						<Dropzone className='file-dropzone' onDrop={this.handleDropRegular} accept="image/*" multiple={false}>
							Drag a file here or click to upload.
						</Dropzone>
					}
					{ this.state.serverInfo.featured &&
						<label className='label'>
							Background Image (Vertical)
							<a onClick={this.deleteImageVertical} style={{ marginLeft: '10px' }}><i className="fas fa-trash-alt" /></a>
						</label>
					}
					{ this.state.serverInfo.featured &&
						<Dropzone className='file-dropzone' onDrop={this.handleDropFeatured} accept="image/*" multiple={false}>
							Drag a file here or click to upload.
						</Dropzone>
					}
					<p className='control'>
						<label className="label">Youtube URL</label>
						<input
							type='text'
							className='input'
							onChange={(event) => this.handleLinkChange(event, 'youtube')}
							value={this.getLinkUrl('youtube')}
						/>
					</p>
					<p className='control'>
						<label className="label">Twitter URL</label>
						<input
							type='text'
							className='input'
							onChange={(event) => this.handleLinkChange(event, 'twitter')}
							value={this.getLinkUrl('twitter')}
						/>
					</p>
					<p className='control'>
						<label className="label">Twitch URL</label>
						<input
							type='text'
							className='input'
							onChange={(event) => this.handleLinkChange(event, 'twitch')}
							value={this.getLinkUrl('twitch')}
						/>
					</p>
					<p className='control'>
						<label className="label">Reddit URL</label>
						<input
							type='text'
							className='input'
							onChange={(event) => this.handleLinkChange(event, 'reddit')}
							value={this.getLinkUrl('reddit')}
						/>
					</p>
					<div className="columns" style={{ marginTop: '20px' }}>
						<div className="column">
							{saveButton}
						</div>
						<div className="column">
							<button className="button is-medium is-danger is-outlined is-fullwidth" onClick={this.resetForm}>Reset form</button>
						</div>
					</div>
				</div>
				<div className='settings-content is-half'>
					<h3 className='title is-5'>Preview</h3>
					<div className="main-wrapper">
						<div className="list-wrapper standard-list-wrapper">
							<List servers={[this.state.serverInfo]} isShowcase />
						</div>
					</div>
					<div className="main-wrapper">
						<div className="list-wrapper sponsored-list-wrapper">
							<List servers={[this.state.serverInfo]} featured isShowcase />
						</div>
					</div>
				</div>
			</div>
		</div>);
	}
}

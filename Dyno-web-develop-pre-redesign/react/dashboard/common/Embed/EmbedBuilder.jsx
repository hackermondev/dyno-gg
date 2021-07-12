import React from 'react';
import Modal from 'react-responsive-modal';
import SketchPicker from 'react-color';
import Embed from './Embed.jsx';
import { parseChannelMentions, parseRoleMentions } from './MentionParser.js';

export default class EmbedBuilder extends React.Component {
	state = {
		builder: this.defaultBuilder,
		showPicker: false,
		isErrorOpen: false,
		settingsOpen: {
			author: false,
			image: false,
			footer: false,
			fields: false,
		},
		errorMessage: false,
	};

	limits = {
		author: {
			name: 120, // 256,
		},
		title: 120, // 256,
		description: 2048,
		field: {
			name: 120, // 256,
			value: 1024,
		},
		footer: {
			text: 120, // 2048,
		},
	};

	get defaultBuilder() {
		return {
			author: {
				name: false,
				icon_url: false,
				url: false,
			},
			title: false,
			url: false,
			color: false,
			description: false,
			image: { url: false },
			thumbnail: { url: false },
			fields: [],
			footer: { text: false },
			timestamp: false,
		};
	}

	get randomId() {
		const fn = () => (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
		return `${fn()}-${fn()}`;
	}

	componentWillMount() {
		if (this.props.embed) {
			this.setBuilder(this.props.embed);
		}
	}

	componentWillReceiveProps(props) {
		let embed = props.embed;

		if (embed === -1) {
			embed = this.defaultBuilder;
		}

		if (embed) {
			this.setBuilder(embed);
		}
	}

	setBuilder(embed) {
		let { builder } = this.state;

		for (let k of Object.keys(embed)) {
			builder[k] = embed[k];
		}

		if (builder.fields.length) {
			builder.fields = builder.fields.map(f => {
				if (!f.id) f.id = this.randomId;
				return f;
			});
		}

		this.setState({ builder });
	}

	hexToInt(hex) {
		return parseInt(hex.replace('#', ''), 16);
	}

	intToHex(int) {
		const hex = `00000${int.toString(16)}`.slice(-6);
		return `#${hex}`;
	}

	replaceChannelMentions(content) {
		const channelMentions = parseChannelMentions(content, this.props.channels);
		for (let [key, value] of channelMentions) {
			if (key.startsWith('#')) {
				const regex = `(#${value.name})(?!<\\/a>)`;
				content = content.replace(new RegExp(regex), `<#${value.id}>`);
				continue;
			}

			content = content.replace(key, `<#${value.id}>`);
		}

		return content;
	}

	replaceRoleMentions(content) {
		const roleMentions = parseRoleMentions(content, this.props.roles);
		for (let [key, value] of roleMentions) {
			if (key.startsWith('@')) {
				const regex = `([^>]|^)(@${value.name})(?!<\\/a>)`;
				content = content.replace(new RegExp(regex), `$1<@&${value.id}>`);
				continue;
			}

			content = content.replace(key, `<@&${value.id}>`);
		}

		return content;
	}

	validLength(value, ...keys) {
		if (!value || !value.length) {
			return true;
		}
		let limit = this.limits;
		for (let key of keys) {
			if (!limit[key]) {
				return true;
			}
			limit = limit[key];
		}
		if (typeof limit !== 'number') {
			return false;
		}
		if (value.length > limit) {
			return false;
		}
		return true;
	}

	cleanEmbed(embed) {
		let o = Object.assign({}, embed);
		for (let k in o) {
			if (k === 'description' || k === 'value') {
				o[k] = this.replaceChannelMentions(o[k]);
				o[k] = this.replaceRoleMentions(o[k]);
			}

			if (k !== 'inline' && o[k] === false) {
				delete o[k];
				continue;
			}
			if (Array.isArray(o[k])) {
				o[k] = o[k].map(val => this.cleanEmbed(val));
				if (!o[k].length) { delete o[k]; }
				continue;
			}

			if (typeof o[k] === 'object') {
				o[k] = this.cleanEmbed(o[k]);
				if (!Object.keys(o[k]).length) {
					delete o[k];
				}
				continue;
			}
		}
		return o;
	}

	createField = () => {
		const { builder } = this.state;
		if (builder.fields.length >= 25) {
			return;
		}
		builder.fields.push({ id: this.randomId });
		this.setState({ builder });
	}

	handleAuthor = (key, event) => {
		const { builder } = this.state;
		if (!this.validLength(event.target.value, 'author', key)) {
			return;
		}
		builder.author[key] = event.target.value;
		this.setState({ builder });
	}

	handleInput = (key, event) => {
		const { builder } = this.state;
		if (!this.validLength(event.target.value, key)) {
			return;
		}
		builder[key] = event.target.value;
		this.setState({ builder });
	}

	handleInputObject = (type, key, event) => {
		const { builder } = this.state;
		if (!this.validLength(event.target.value, type, key)) {
			return;
		}
		builder[type][key] = event.target.value;
		this.setState({ builder });
	}

	validateURL = (field, event) => {
		if (!event.target.value || !event.target.value.length) {
			return;
		}

		if (!event.target.value.match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/)) {
			return this.openErrorModal(`Please use a valid url for ${field}.`);
		}
	}

	handleField = (field, key, event) => {
		const { builder } = this.state;
		const index = builder.fields.findIndex(f => f.id === field.id);
		if (index > -1) {
			let value = event.target.hasOwnProperty('checked') ? event.target.checked : event.target.value;
			if (typeof value === 'string' && !this.validLength(value, 'field', key)) {
				return;
			}
			builder.fields[index][key] = value;
			this.setState({ builder });
		}
	}

	handleColorChange = (color, event) => {
		const { builder } = this.state;
		builder.color = this.hexToInt(color.hex);
		this.setState({ builder });
	}

	toggleColorPicker = () => {
		this.setState({ displayColorPicker: !this.state.displayColorPicker });
	};

	handleClose = () => {
		this.setState({ displayColorPicker: false });
	};

	getFieldTotal() {
		const { builder } = this.state;
		return builder.fields.reduce((n, o) => {
			n += o.name ? o.name.length : 0;
			n += o.value ? o.value.length : 0;
			return n;
		}, 0);
	}

	getTotalLimits = (limits, parent) => {
		const { builder } = this.state;

		limits = limits || this.limits;

		return Object.keys(limits).reduce((n, key) => {
			let limit = limits[key];

			if (key === 'field') {
				n += this.getFieldTotal();
				return n;
			}

			if (typeof limit === 'string') {
				let value = '';
				if (parent && builder[parent]) {
					value = builder[parent][key];
				} else if (!parent) {
					value = builder[key];
				}

				n += value.length || 0;
				return n;
			} else if (typeof limit === 'object') {
				n += this.getTotalLimits(limits[key], key);
				return n;
			}
			return n;
		}, 0);
	}

	getTotal = (obj, parent) => {
		const { builder } = this.state;

		obj = obj || builder;

		return Object.keys(obj).reduce((n, key) => {
			let value = obj[key];

			if (key === 'field') {
				n += this.getFieldTotal();
				return n;
			}

			if (typeof value === 'string') {
				let value = parent ? builder[parent][key] : builder[key];
				n += value.length || 0;
				return n;
			} else if (typeof value === 'object') {
				n += this.getTotalLimits(obj[key], key);
				return n;
			}
			return n;
		}, 0);
	}

	handleSave = () => {
		const total = this.getTotalLimits();

		if (total > 6000) {
			return this.openErrorModal();
			// return _showError(`The embed can't be more than 6,000 characters in length.`);
		}

		if (this.props.onSave) {
			let { builder } = this.state;
			builder.fields = builder.fields
				.filter(f => !!f.name && !!f.value)
				.map(f => ({ name: f.name, value: f.value, inline: !!f.inline }));
			this.props.onSave(this.cleanEmbed(builder));
		}
	}

	handleCancel = () => {
		this.setState({ builder: this.defaultBuilder });
		if (this.props.onCancel) {
			this.props.onCancel(this.state.builder);
		}
	}

	handleDelete = () => {
		this.setState({ builder: this.defaultBuilder });
		if (this.props.onDelete) {
			this.props.onDelete(this.state.builder);
		}
	}

	handleClone = () => {
		if (this.props.onClone) {
			this.props.onClone();
		}
	}

	openErrorModal = (error) => {
		if (error) {
			this.setState({ errorMessage: error, isErrorOpen: true });
		} else {
			this.setState({ isErrorOpen: true });
		}
	}

	closeErrorModal = () => {
		this.setState({ isErrorOpen: false, errorMessage: false });
	}

	toggleSetting = (type) => {
		const { settingsOpen } = this.state;
		settingsOpen[type] = !settingsOpen[type];
		this.setState({ settingsOpen });
	}

	render() {
		const { builder } = this.state;
		const { roles, channels } = this.props;

		const popover = {
			position: 'absolute',
			zIndex: '2',
		}
		const cover = {
			position: 'fixed',
			top: '0px',
			right: '0px',
			bottom: '0px',
			left: '0px',
		}

		const colorStyle = {
			backgroundColor: builder.color ? this.intToHex(builder.color) : '#4f545c',
		};

		const limitTotal = this.getTotalLimits();
		const total = this.getTotal();

		const errorMessage = this.state.errorMessage ||
			`The embed can't be more than 6,000 characters in length. This embed is ${limitTotal} characters.`;

		const modalClasses = {
            modal: 'help-modal',
		};

		const showIcon = (
			<span className='icon is-link'>
				<i className='fa fa-plus-circle'></i>
			</span>
		);

		const hideIcon = (
			<span className='icon is-link'>
				<i className='fa fa-minus-circle'></i>
			</span>
		);

		return (
			<div className='embed-builder'>
				<div className='embed-builder-controls'>
					<label>* All fields are optional</label>
					<p className='control'>
						<label className='label'>Color</label>
						<a className='button' onClick={this.toggleColorPicker}>Choose Color</a>
						<span className='builder-color-preview' style={colorStyle} onClick={this.toggleColorPicker}></span>
					</p>
					{ this.state.displayColorPicker ? <div style={popover}>
					<div style={cover} onClick={this.toggleColorPicker}/>
						<SketchPicker
							color={this.intToHex(builder.color)}
							onChangeComplete={this.handleColorChange} />
					</div> : null }

					<div className='control-group'>
						<p className='control'>
							<label className='label' htmlFor='title'>Title</label>
							<input id='title'
								className='input is-expanded'
								type='text'
								placeholder='Enter Title'
								value={builder.title || ''}
								onChange={this.handleInput.bind(this, 'title')} />
						</p>
						<p className='control'>
							<label className='label' htmlFor='url'>Title URL</label>
							<input id='url'
								className='input is-expanded'
								type='text'
								placeholder='Enter URL'
								value={builder.url || ''}
								onBlur={this.validateURL.bind(this, 'Title URL')}
								onChange={this.handleInput.bind(this, 'url')} />
						</p>
					</div>

					<label className='label'>Description</label>
					<p className='control'>
						<textarea className='input builder-description'
							placeholder='Enter Description'
							value={builder.description || ''}
							onChange={this.handleInput.bind(this, 'description')}></textarea>
					</p>

					<fieldset className='control-group-toggle' onClick={this.toggleSetting.bind(this, 'author')}>
						<legend>
							{this.state.settingsOpen.author ? hideIcon : showIcon} Author
						</legend>
					</fieldset>
					{this.state.settingsOpen.author && (
						<div className='control-group'>
							<p className='control'>
								<label className='label' htmlFor='author-name'>Author Name</label>
								<input id='author-name'
									className='input is-expanded'
									type='text'
									placeholder='Enter Name'
									value={builder.author && (builder.author.name || '')}
									onChange={this.handleInputObject.bind(this, 'author', 'name')} />
							</p>
							<p className='control'>
								<label className='label' htmlFor='author-icon'>Author Icon</label>
								<input id='author-icon'
									className='input is-expanded'
									type='text'
									placeholder='Enter URL'
									value={builder.author && (builder.author.icon_url || '')}
									onBlur={this.validateURL.bind(this, 'Author Icon')}
									onChange={this.handleInputObject.bind(this, 'author', 'icon_url')} />
							</p>
						</div>)}

					<fieldset className='control-group-toggle' onClick={this.toggleSetting.bind(this, 'image')}>
						<legend>
							{this.state.settingsOpen.image ? hideIcon : showIcon} Image/Thumb
						</legend>
					</fieldset>
					{this.state.settingsOpen.image && (
						<div className='control-group'>
							<p className='control'>
								<label className='label' htmlFor='thumbnail'>Thumbnail</label>
								<input id='thumbnail'
									className='input is-expanded'
									type='text'
									placeholder='Enter URL'
									value={builder.thumbnail && (builder.thumbnail.url || '')}
									onBlur={this.validateURL.bind(this, 'Thumbnail')}
									onChange={this.handleInputObject.bind(this, 'thumbnail', 'url')} />
							</p>
							<p className='control'>
								<label className='label' htmlFor='image'>Image</label>
								<input id='image'
									className='input is-expanded'
									type='text'
									placeholder='Enter URL'
									value={builder.image && (builder.image.url || '')}
									onBlur={this.validateURL.bind(this, 'Image')}
									onChange={this.handleInputObject.bind(this, 'image', 'url')} />
							</p>
						</div>)}

					<fieldset className='control-group-toggle' onClick={this.toggleSetting.bind(this, 'footer')}>
						<legend>
							{this.state.settingsOpen.footer ? hideIcon : showIcon} Footer
						</legend>
					</fieldset>
					{this.state.settingsOpen.footer && (
						<div className='control-group'>
							<p className='control'>
								<label className='label' htmlFor='footer'>Footer</label>
								<input id='footer'
									className='input is-expanded'
									type='text'
									placeholder='Enter Text'
									value={builder.footer && (builder.footer.text || '')}
									onChange={this.handleInputObject.bind(this, 'footer', 'text')} />
							</p>
							<p className='control'>
								<label className='label' htmlFor='footer'>Footer Icon</label>
								<input id='footer'
									className='input is-expanded'
									type='text'
									placeholder='Enter URL'
									value={builder.footer && (builder.footer.icon_url || '')}
									onBlur={this.validateURL.bind(this, 'Footer Icon')}
									onChange={this.handleInputObject.bind(this, 'footer', 'icon_url')} />
							</p>
						</div>)}

					<fieldset className='control-group-toggle' onClick={this.toggleSetting.bind(this, 'fields')}>
						<legend>
							{this.state.settingsOpen.fields ? hideIcon : showIcon} Fields
						</legend>
					</fieldset>
					{this.state.settingsOpen.fields && builder.fields && builder.fields.length ? (
						builder.fields.map(field => (
							<div key={field.id} className='control-group'>
								<p className='control'>
									<input className='input is-expanded'
										type='text'
										placeholder='Name'
										value={field.name || ''}
										onChange={this.handleField.bind(this, field, 'name')} />
								</p>
								<p className='control has-addons'>
									<textarea className='input is-expanded builder-field'
										cols='10'
										rows='1'
										placeholder='Value'
										value={field.value || ''}
										onChange={this.handleField.bind(this, field, 'value')}></textarea>
									<input id={field.id} type='checkbox' checked={field.inline || false} onChange={this.handleField.bind(this, field, 'inline')} />
									<label className='label' htmlFor={field.id}>Inline</label>
								</p>
								{/* <p className='control'>
								</p> */}
							</div>
						))) : ''}
					{this.state.settingsOpen.fields && (
						<button className='add-field' onClick={this.createField}><strong>+</strong> Add Field</button>
					)}
				</div>
				<div className='embed-builder-controls'>
					<a className='button is-info' onClick={this.handleSave}>{this.props.saveText || 'Save & Send'}</a>
					{this.props.cancelButton && (
						<a className='button is-danger' onClick={this.handleCancel}>Cancel</a>
					)}
					{this.props.deleteButton && (
						<a className='button is-danger' onClick={this.handleDelete}>Delete</a>
					)}
					{this.props.cloneButton && (
						<a className='button is-info' style={{ marginLeft: '0.5em' }} onClick={this.handleClone}>Clone</a>
					)}
				</div>
				<label className='label'>Preview</label>
				<div className='embed-message-preview'>
					<div className='embed-message-content'>
						<div className={`embed-message-avatar ${this.props.isPremium ? 'is-premium' : ''}`}></div>
						<div className='embed-message-comment'>
							<div className='embed-message-body'>
								<h2>
									<span className='username-wrapper'>
										<strong className='user-name'>Dyno</strong>
										<span className='bot-tag'>BOT</span>
									</span>
									<span className='highlight-separator'> - </span>
									<span className='timestamp'>Today at 12:53 AM</span>
								</h2>
							</div>
							{total && total > 0 ? (<Embed embed={builder} channels={channels} roles={roles}/>) : ''}
						</div>
					</div>
				</div>
				<Modal open={this.state.isErrorOpen} classNames={modalClasses} little={true} onClose={this.closeErrorModal}>
					<div className='help-content'>
						<p>{errorMessage}</p>
					</div>
				</Modal>
			</div>
		);
	}
}

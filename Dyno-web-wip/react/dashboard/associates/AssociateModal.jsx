import axios from 'axios';
import React from 'react';
import Dropzone from 'react-dropzone';
import RichCheckbox from '../common/RichCheckbox.jsx';

export default class AssociateModal extends React.Component {
	state = {
		associate: this.defaultAssociate,
	};

	get defaultAssociate() {
		return {
			name: '',
			description: '',
			banner: '',
			links: [],
			sponsor: false,
		};
	}

	componentDidMount() {
		if (this.props.associate) {
			this.setState({ associate: this.props.associate || this.defaultAssociate, preview: this.props.associate.banner });
		}
	}

	componentWillReceiveProps(props) {
		if (props.associate) {
			this.setState({ associate: props.associate || this.defaultAssociate, preview: this.props.associate.banner });
		}
	}

	handleChange(key, event) {
		const { associate } = this.state;
		const value = event.target.value;
		associate[key] = value;
		this.setState({ associate });
	}

	handleCheckbox(type, identifier, isEnabled) {
		const { associate } = this.state;
		associate[type] = isEnabled;
		this.setState({ associate });
	}

	handleLink(index, link, type, event) {
		const { associate } = this.state;
		associate.links[index][type] = event.target.value;
		this.setState({ associate });
	}

	createLink = () => {
		const { associate } = this.state;
		if (associate.links.length >= 5) {
			return;
		}

		associate.links.push({
			name: '',
			value: '',
		});

		this.setState({ associate });
	}

	handleDrop = ([file]) => {
		this.setState({ file, preview: file.preview });
	}

	saveAssociate = async () => {
		const { associate } = this.state;

		if (!associate.name) {
			return _showError('Please set a name.');
		}

		if (!associate.description) {
			return _showError('Please set a description.');
		}

		associate.links = associate.links.filter(l => l.name.length && l.value.length);

		if (!associate.links || !associate.links.length) {
			return _showError('Please add a link.');
		}

		if (!associate.links.find(l => l.name === 'Server Invite')) {
			return _showError('Please add a <strong>Server Invite</strong> link.');
		}

		if (associate.links.find(l => !l.value || !l.value.startsWith('http'))) {
			return _showError('Links must start with http:// or https://');
		}

		if (!this.props.isEdit && !this.state.file) {
			return _showError('Please add a banner.');
		}

		const formData = new FormData();

		if (this.state.file) {
			formData.append('banner', this.state.file);
		}

		formData.append('name', associate.name);
		formData.append('description', associate.description);

		for (let i in associate.links) {
			let link = associate.links[i];
			formData.append(`links[${i}][name]`, link.name);
			formData.append(`links[${i}][value]`, link.value);
		}

		if (associate.sponsor) {
			formData.append('sponsor', associate.sponsor);
		}

		try {
			const url = this.props.isEdit ? '/api/server/' + server + '/associates/update' : '/api/server/' + server + '/associates/create';
			const response = await axios.post(url, formData);

			this.props.onClose(response.data);
		} catch (err) {
			if (err.response && err.response.data) {
				return _showError(err.response.data);
			}

			return _showError(err);
		}
	}

	render() {
		const { associate, preview } = this.state;
		const disableName = this.props.isEdit;

		return (
			<div className='associate-form'>
				<h3 className='title is-5'>{this.props.isEdit ? 'Edit' : 'Add'} Associate</h3>
				<p className='control'>
					<label className='label'>Name</label>
					<input className='input' type='text' name='name'
						value={associate.name}
						disabled={disableName}
						onChange={this.handleChange.bind(this, 'name')}
					/>
				</p>
				<p className='control'>
					<label className='label'>Description</label>
					<textarea className='input' name='description'
						value={associate.description}
						onChange={this.handleChange.bind(this, 'description')}>
					</textarea>
				</p>
				<div className='control'>
					<RichCheckbox
						text='Sponsor'
						isBlock={true}
						onChange={this.handleCheckbox.bind(this, 'sponsor')}
						defaultValue={associate.sponsor ? true : false}
					/>
				</div>
				{associate.links && associate.links.length ? (
					associate.links.map((link, index) => (
						<p key={index} className='control has-addons'>
							<input className='input is-expanded'
								type='text'
								placeholder='Name'
								value={link.name}
								onChange={this.handleLink.bind(this, index, link, 'name')} />
							<input className='input is-expanded'
								type='text'
								placeholder='Link'
								value={link.value}
								onChange={this.handleLink.bind(this, index, link, 'value')} />
						</p>
					))) : ''}
				<a className='button is-info' onClick={this.createLink} disabled={associate.links && associate.links.length >= 5}>Add Link</a>
				<Dropzone className='file-dropzone' onDrop={this.handleDrop} accept="image/*" multiple={false}>
					Drag a file here or click to upload.
				</Dropzone>
				{preview && (
					<div className='associate-preview'>
						<label className='label'>Preview</label>
						<img src={preview} alt="image preview" />
					</div>
				)}
				<button className='button is-success' onClick={this.saveAssociate}>Save</button>
			</div>
		);
	}
}


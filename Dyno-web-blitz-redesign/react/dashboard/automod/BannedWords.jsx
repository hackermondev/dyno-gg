import React from 'react';
import SettingCheckbox from '../common/SettingCheckbox.jsx';
import { updateBadWords } from './service/automodService.js';
import { updateModuleSetting } from '../service/dashboardService.js';
// import SettingSelector from './SettingSelector.jsx';
// import SelectSetting from '../common/SelectSetting.jsx';
// import RichSettingSelect from '../common/RichSettingSelect.jsx';

export default class BannedWords extends React.Component {
	state = {
		automod: {},
		formData: {
			type: 'badwords',
			value: '',
		},
	}

	componentDidMount() {
		this.setState({ automod: this.props.automod || {} });
	}

	componentWillReceiveProps(props) {
		this.setState({ automod: props.automod || {} });
	}

	deleteWord = async (key, word) => {
		let words = this.state.automod[key];
		const index = words.findIndex(w => w === word);
		if (index !== -1) {
			words.splice(index, 1);
			await this.setState({ words });
			updateModuleSetting(this.props.data.module, key, words, 'Banned Words');
		}
	}

	setWords = (event) => {
		const { formData } = this.state;
		formData.value = event.target.value;
		this.setState({ formData });
	}

	setType = (event) => {
		const formData = this.state.formData;
		formData.type = event.target.value;
		this.setState({ formData });
	}

	addWords = async () => {
		const { automod, formData } = this.state;
		const values = automod[formData.type] || [];

		automod[formData.type] = values.concat(formData.value.replace(', ', ',').split(','));

		try {
			await updateBadWords(this.props.data.module, formData.type, formData.value);
		} catch (err) {
			return;
		}

		formData.value = '';
		this.setState({ automod, formData });
	}

	render() {
		const { badwords, exactwords } = this.state.automod;

		const WildTags = badwords && badwords.map(word => (
			<span key={word} className='tag-wrap'>
				<span className='tag'>
					{word}
					<button className='delete' onClick={this.deleteWord.bind(this, 'badwords', word)}></button>
				</span>
			</span>
		));

		const ExactTags = exactwords && exactwords.map(word => (
			<span key={word} className='tag-wrap'>
				<span className='tag'>
					{word}
					<button className='delete' onClick={this.deleteWord.bind(this, 'exactwords', word)}></button>
				</span>
			</span>
		));
		
		const GlobalTags = config.globalwords && config.globalwords.map(word => (
			<span key={word} className='tag-wrap'>
				<span className='tag'>{word}</span>
			</span>
		));

		return (<div className='automod-settings' className='settings-panel'>
			<div className='settings-content'>
				<h3 className='title is-5'>Add Banned Words</h3>
				<div className='module-multitext'>
					<label className='label'>Words (comma separated list) - Keep in mind that words have to be 3 characters or longer.</label>
					<p className='control'>
						<textarea className='input' value={this.state.formData.value} onChange={this.setWords}></textarea>
					</p>
					<p className='control'>
						<label className='radio' htmlFor='badwords'>
							<input id='badwords' type='radio' className='radio' name='type' value='badwords' checked={this.state.formData.type === 'badwords'} onChange={this.setType} />
							Match any part of the word
						</label>
					</p>
					<p className='control'>
						<label className='radio' htmlFor='exactwords'>
							<input id='exactwords' type='radio' className='radio' name='type' value='exactwords' checked={this.state.formData.type === 'exactwords'} onChange={this.setType} />
							Match exact word only
						</label>
					</p>
					<input className='button is-info' type='button' value='Update' onClick={this.addWords} />
				</div>
			</div>
			{!this.state.automod.disableGlobal && (
				<div className='settings-content'>
					<h3 className='title is-5'>Default Banned Words</h3>
					{config.globalwords && config.globalwords.length ?
						(<div className='tag-group'>{GlobalTags}</div>) :
						(<p>There are no words in this list.</p>)}
				</div>
			)}
			<div className='settings-content'>
				<h3 className='title is-5'>Banned Words (wildcard)</h3>
				{badwords && badwords.length ?
					(<div className='tag-group'>{WildTags}</div>) :
					(<p>There are no words in this list.</p>)}
			</div>
			<div className='settings-content'>
				<h3 className='title is-5'>Banned Words (exact)</h3>
				{exactwords && exactwords.length ?
					(<div className='tag-group'>{ExactTags}</div>) :
					(<p>There are no words in this list.</p>)}
			</div>
		</div>);
	}
}

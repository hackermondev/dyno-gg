import React from 'react';
import SettingCheckbox from '../common/SettingCheckbox.jsx';
import { updateBadWords } from './service/automodService.js';
import { updateModuleSetting } from '../service/dashboardService.js';
// import SettingSelector from './SettingSelector.jsx';
// import SelectSetting from '../common/SelectSetting.jsx';
// import RichSettingSelect from '../common/RichSettingSelect.jsx';

export default class BannedWords extends React.Component {
	state = {
		formData: {
			type: 'badwords',
			value: '',
		},
		badwords: [],
		exactwords: [],
	}

	componentDidMount() {
		this.setState({ exactwords: this.props.automod.exactwords, badwords: this.props.automod.badwords });
	}

	UNSAFE_componentWillReceiveProps(props) {
		this.setState({ exactwords: this.props.automod.exactwords, badwords: this.props.automod.badwords });
	}

	deleteWord = async (key, word) => {
		let words = this.state[key];
		words = words.filter(w => w !== word);
		const stateUpdate = {};
		stateUpdate[key] = words;
		await this.setState(stateUpdate);
		updateModuleSetting(this.props.data.module, key, words, 'Banned Words');
	}

	deleteAllWords = async (key) => {
		const areYouSureBro = confirm('This action is IRREVERSIBLE, do you really wish to delete all banned words in this group?');
		if(!areYouSureBro) return;
		const stateUpdate = {};
		stateUpdate[key] = [];
		await updateModuleSetting(this.props.data.module, key, [], 'Banned Words');
		await this.setState(stateUpdate);
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
		const { formData } = this.state;
		let values = this.state[formData.type] || [];

		const newWords = formData.value.replace(', ', ',').split(',');
		values = values.concat(newWords);
		values = [...(new Set(values)).values()];

		try {
			await updateBadWords(this.props.data.module, formData.type, formData.value);
		} catch (err) {
			return;
		}

		formData.value = '';
		const stateUpdate = { formData };
		stateUpdate[formData.type] = values;
		this.setState(stateUpdate);
	}

	render() {
		const { badwords, exactwords } = this.state;

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
			{!this.props.automod.disableGlobal && (
				<div className='settings-content'>
					<h3 className='title is-5'>Default Banned Words</h3>
					{config.globalwords && config.globalwords.length ?
						(<div className='tag-group'>{GlobalTags}</div>) :
						(<p>There are no words in this list.</p>)}
				</div>
			)}
			<div className='settings-content'>
				<h3 className='title is-5 is-flex'>
					Banned Words (wildcard)
					<a className='delete-btn-fade-text' onClick={() => this.deleteAllWords('badwords')}>
						<i className="far fa-trash fa-lg"></i>
						<span className="hidden-text">Delete All</span>
					</a>
				</h3>
				{badwords && badwords.length ?
					(<div className='tag-group'>{WildTags}</div>) :
					(<p>There are no words in this list.</p>)}
			</div>
			<div className='settings-content'>
				<h3 className='title is-5 is-flex'>
					Banned Words (exact)
					<a className='delete-btn-fade-text' onClick={() => this.deleteAllWords('exactwords')}>
						<i className="far fa-trash fa-lg"></i>
						<span className="hidden-text">Delete All</span>
					</a>
				</h3>
				{exactwords && exactwords.length ?
					(<div className='tag-group'>{ExactTags}</div>) :
					(<p>There are no words in this list.</p>)}
			</div>
		</div>);
	}
}

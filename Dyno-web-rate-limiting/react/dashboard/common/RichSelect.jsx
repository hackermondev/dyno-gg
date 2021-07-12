import React from 'react';
import Select from 'react-select';
import Help from './Help.jsx';
import '!style-loader!css-loader!react-select/dist/react-select.css';
import '!style-loader!css-loader!../styles/selector.css';

export default class RichSelect extends React.Component {
	state = {
		selectedOption: false,
		hasChanged: false,
	}

	componentWillMount() {
		let { selectedOption, hasChanged } = this.state;
		if (hasChanged) {
			return;
		}
		const defaultValue = this.props.defaultValue;
		if (defaultValue) {
			selectedOption = defaultValue && defaultValue.value && defaultValue.label ? defaultValue : { value: defaultValue.id, label: defaultValue.name };
		}
		this.setState({ selectedOption });
	}

	componentWillReceiveProps(props) {
		let { selectedOption, hasChanged } = this.state;
		if (hasChanged) {
			return;
		}
		const defaultValue = props.defaultValue;
		if (defaultValue) {
			selectedOption = defaultValue && defaultValue.value && defaultValue.label ? defaultValue : { value: defaultValue.id, label: defaultValue.name };
		}
		this.setState({ selectedOption });
	}

	handleChange = async (selectedOption) => {
		await this.setState({ hasChanged: true, selectedOption });
		if (this.props.onChange) {
			this.props.onChange(this.props, selectedOption);
		}
	}

	render() {
		const { selectedOption } = this.state;

		let value = selectedOption && selectedOption.value;
		let options = this.props.options || [];

		options = options.map(option => option.value && option.label ? option : { value: option.id, label: option.name });

		return (
			<div className='control rich-select'>
				<label className='label'>
					{!this.props.hideLabel && (<label className='label'>{this.props.text}{this.props.helpText && (<Help text={this.props.helpText} />)}</label>)}
				</label>
				<Select
					value={value}
					placeholder={this.props.defaultOption}
					disabled={this.props.disabled}
					onChange={this.handleChange}
					clearable={this.props.clearable || true}
					searchable={this.props.searchable || true}
					options={options} />
			</div>
		);
	}
}

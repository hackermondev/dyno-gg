import React from 'react';
import Select from 'react-select';
import Help from './Help.jsx';
import '!style-loader!css-loader!react-select/dist/react-select.css';
import '!style-loader!css-loader!../styles/selector.css';

export default class RichMultiSelect extends React.Component {
	state = {
		selectedOptions: false,
		options: false,
	}

	handleChange = (selectedOptions) => {
		if (this.props.filter) {
			selectedOptions = this.props.filter(this.props, selectedOptions);
		}
		this.setState({ selectedOptions });
		if (this.props.onChange) {
			this.props.onChange(this.props, selectedOptions);
		}
	}

	componentWillMount() {
		this.setState({
			selectedOptions: this.props.defaultValue || false,
			options: this.props.options,
		});
	}

	componentWillReceiveProps(props) {
		this.setState({
			selectedOptions: props.defaultValue || false,
			options: props.options,
		});
	}

	render() {
		const { selectedOptions } = this.state;
		const defaultValue = this.props.defaultValue;

		let value = selectedOptions && selectedOptions.value;
		if (!value && defaultValue) {
			value = defaultValue.value && defaultValue.label ? value :
				defaultValue.map(d => ({ value: d.id, label: d.name }));
		}

		let options = this.props.options || [];
		options = options.map(option => {
			return option.value && option.label ? option : { value: option.id, label: option.name };
		});

		return (
			<div className='rich-select multi-selector control'>
				<label className='label'>
					{this.props.label}
					{this.props.helpText && (<Help text={this.props.helpText} />)}
				</label>
				<Select
					multi={this.props.multi || true}
					value={value}
					placeholder={this.props.placeholder}
					clearable={this.props.clearable}
					onChange={this.handleChange}
					searchable={true}
					options={options} />

			</div>
		)
	}
}

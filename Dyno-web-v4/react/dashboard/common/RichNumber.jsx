import React from 'react';
import NumericInput from 'react-numeric-input';
import Help from './Help.jsx';

export default class RichNumber extends React.Component {
	state = {
		value: 0,
	}

	componentDidMount() {
		this.setState({ value: this.props.defaultValue });
	}

	componentWillReceiveProps(props) {
		if (props.defaultValue === this.state.value) {
			return;
		}
		this.setState({ value: props.defaultValue });
	}

	onChange = (value) => {
		this.setState({ value });
		if (this.props.onChange) {
			this.props.onChange(value);
		}
	}

	onClick = () => {
		if (this.props.onClick) {
			this.props.onClick(this.state.value);
		}
	}

	render() {
		let spanProps = {};

		if (this.props.description) {
			spanProps = {
				className: 'hint--bottom hint--large hint--info hint--rounded',
				'aria-label': this.props.description,
			};
		}

		return (
			<div className={`control rich-number ${this.props.className || ''}`}>
				<span {...spanProps}>
					{this.props.label && (<label className="label">{this.props.label}</label>)}
					<div className='fill-max'>
						<NumericInput
							min={this.props.min || 0}
							max={this.props.max || false}
							step={this.props.step || 1}
							strict={true}
							style={false}
							value={this.state.value || 0}
							onChange={this.onChange} />
						<a className="button is-info" onClick={this.onClick}>Update</a>
					</div>
				</span>
				{this.props.helpText && (<Help text={this.props.helpText} />)}
			</div>
		);
	}
}

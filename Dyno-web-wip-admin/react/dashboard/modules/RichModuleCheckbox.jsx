import React from 'react';

export default class RichModuleCheckbox extends React.Component {
	constructor() {
		super();
		this.state = {
			isEnabled: false,
		}

		this.onChange = this.onChange.bind(this);
    }

    componentDidMount() {
        this.setState({ isEnabled: this.props.defaultValue });
	}

	componentWillReceiveProps(props) {
		if (props.defaultValue === this.state.isEnabled) {
			return;
		}
		this.setState({ isEnabled: props.defaultValue });
	}

	async onChange() {
		this.props.onChange(this.props.identifier, !this.state.isEnabled);
		this.setState({ isEnabled: !this.state.isEnabled });
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
			<div className={`control rich-toggle rich-module is-pulled-left ${this.props.className || ''}${this.props.disabled ? 'locked' : (this.state.isEnabled ? 'enabled' : 'disabled')}`} onClick={this.onChange}>
				<span {...spanProps}>
					<input
						className=""
						type="checkbox"
						checked={this.state.isEnabled}
						onChange={this.onChange}/>
					<label className="checkbox" htmlFor={this.props.text}>{this.props.text}</label>
				</span>
				{this.props.helpText ? (<p className="help-text">{this.props.helpText}</p>) : ''}
				<small>{this.props.disabled ? 'Unlock with Premium' : (this.state.isEnabled ? 'Click to Disable' : 'Click to Enable')}</small>
			</div>
		);
	}
}

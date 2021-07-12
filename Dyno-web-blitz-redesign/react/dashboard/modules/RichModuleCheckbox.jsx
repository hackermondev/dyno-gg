import React from 'react';
import { Link } from 'react-router-dom';

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
		// const params = { id: 123 };
		const params = this.props.match.params;
		const module = this.props.module;
		let spanProps = {};

		if (this.props.description) {
			spanProps = {
				className: 'hint--bottom hint--large hint--info hint--rounded',
				'aria-label': this.props.description,
			};
		}

		return (
			<div className={`control rich-module is-pulled-left ${this.props.className || ''}${this.props.disabled ? 'locked' : (this.state.isEnabled ? 'enabled' : 'disabled')}`}>
				<span {...spanProps}>
					<h4 className="title is-5" htmlFor={this.props.text}>{this.props.text}</h4>
					<div className='command-toggle' onClick={this.onChange}>
						<input
							className=''
							type='checkbox'
							checked={this.state.isEnabled} 
							onChange={this.onChange} />
						<label className='checkbox' htmlFor={this.props.text}></label>
					</div>
				</span>
				{this.props.helpText ? (<p className="help-text">{this.props.helpText}</p>) : ''}
				{(module.hasPartial || module.hasCommands) && (
					<div className='controls'>
						{module.hasPartial && (
							<Link to={`/manage/${params.id}/${module.partialId}`} className='button module-settings'>Settings</Link>)}
						{module.hasCommands && (<Link to={`/manage/${params.id}/${module.partialId}/commands`} className='button module-settings'>Commands</Link>)}
					</div>
				)}
			</div>
		);
	}
}

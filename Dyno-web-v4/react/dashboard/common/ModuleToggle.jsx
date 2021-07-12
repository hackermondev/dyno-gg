import React from 'react';

export default class ModuleToggle extends React.Component {
	constructor() {
		super();
		this.state = {
			isEnabled: false,
		};

		this.onChange = this.onChange.bind(this);
    }

    componentDidMount() {
        this.setState({ isEnabled: this.props.defaultValue });
    }

	async onChange() {
		this.props.identifier.enabled = !this.state.isEnabled;
		this.props.onChange(this.props.identifier, !this.state.isEnabled);
		this.setState({ isEnabled: !this.state.isEnabled });
	}

    render() {
		return (
			<div className="control module-toggle" onClick={this.onChange}>
				<input
					className=""
					type="checkbox"
					checked={this.state.isEnabled} 
					onChange={this.onChange} />
				<label className="checkbox" htmlFor={this.props.text}>
					{this.state.isEnabled ? 'Disable Module' : 'Enable Module'}
				</label>
			</div>
		);
	}
}

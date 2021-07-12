import React from 'react';

export default class Select extends React.Component {
	constructor() {
		super();
		this.state = {
			name: '',
			value: '',
		}

		this.onChange = this.onChange.bind(this);
    }

	componentDidMount() {
        this.setState({ value: this.props.defaultValue });
	}

    componentWillReceiveProps(props) {
        this.setState({ value: props.defaultValue });
    }

	async onChange(event) {
		const option = event.target.selectedOptions[0];
		this.setState({ name: option.dataset.name, value: event.target.value });
		if (this.props.onChange) {
			this.props.onChange(event);
		}
	}

    render() {
		return (<div>
			<div className='control'>
				{!this.props.hideLabel ? (<label className='label'>{this.props.text}</label>) : ''}
				<span className='select'>
					<select className='module-setting-dropdown' value={this.state.value} onChange={this.onChange} disabled={this.props.disabled}>
						<option>{this.props.defaultOption}</option>
						{this.props.options.map(option => (
							<option key={option.id} data-name={option.name} value={option.id}>{option.name}</option>
						))}
					</select>
				</span>
			</div>
		</div>);
	}
}

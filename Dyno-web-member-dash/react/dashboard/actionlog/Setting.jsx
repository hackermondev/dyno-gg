import React from 'react';
import SettingCheckbox from '../common/SettingCheckbox.jsx';
import RichSettingSelect from '../common/RichSettingSelect.jsx';
import '!style-loader!css-loader!./styles/actionlog.css';
// import SelectSetting from '../../common/SelectSetting.jsx';

export default class Setting extends React.Component {
	state = {
		isEnabled: false,
		selectChannel: false,
		value: false,
	}

	componentDidMount() {
		this.setState({ isEnabled: this.props.isEnabled, value: this.props.value, selectChannel: this.props.selectChannel });
	}

	componentWillReceiveProps(props) {
		this.setState({ isEnabled: props.isEnabled, value: props.value, selectChannel: props.selectChannel });
	}

    render() {
		const module = this.props.module;

		return this.state.selectChannel ? (
			<div className='actionlog-setting'>
				<RichSettingSelect
					module={module}
					setting={this.props.setting}
					friendlyName={this.props.text}
					text={this.props.text}
					defaultValue={this.state.value}
					defaultOption='Select Channel'
					options={this.props.options} />
			</div>
		) : (
			<SettingCheckbox module={this.props.module} setting={this.props.setting}
				friendlyName={this.props.text} defaultValue={this.state.isEnabled} text={this.props.text} />
		);
	}
}

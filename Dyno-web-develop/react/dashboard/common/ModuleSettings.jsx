import React from 'react';
import Loader from './Loader.jsx';
import FeatureLocker from '../common/FeatureLocker.jsx';
import ModuleToggle from '../common/ModuleToggle.jsx';

export default class ModuleSettings extends React.Component {
	state = {
		isLoading: true,
		module: false,
	}

	componentDidMount() {
		let { module } = this.state;
		if (this.props.data && this.props.data.module) {
			module = this.props.data.module;
		}

		this.setState({ module });
	}

	render() {
		if (this.props.isLoading) {
			return <Loader />;
		}

		const { module } = this.state;
		const defaultClasses = 'module-content module-settings';
		const classNames = this.props.classes ? `${defaultClasses} ${this.props.classes}` : defaultClasses;

		const Toggle = (
			<ModuleToggle
				identifier={module}
				text={module.friendlyName || module.name}
				onChange={this.props.data.toggleModule}
				disabled={module.isPremium && !this.props.isPremium}
				defaultValue={module.enabled} />
		);

		const isLocked = this.props.featureLocker && !this.props.data.isPremium;

		if (module.inMaintenance) {
			return (
				<div id={`module-${this.props.name}`} className={classNames}>
					<h3 className='title is-4'>{this.props.title} {!isLocked && Toggle}</h3>
					<h5>This module is under maintenance, please come back later to make your changes.</h5>
				</div>
			);
		}

		return (
			<div id={`module-${this.props.name}`} className={classNames}>
				<h3 className='title is-4'>{this.props.title} {!isLocked && Toggle}</h3>
				{this.props.featureLocker ? (
					<FeatureLocker isLocked={!this.props.data.isPremium}>
						{this.props.children}
					</FeatureLocker>
				) : this.props.children}
			</div>
		);
	}
}

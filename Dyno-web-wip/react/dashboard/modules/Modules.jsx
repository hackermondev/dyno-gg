import React from 'react';
import axios from 'axios';
import Module from './Module.jsx';

export default class Modules extends React.Component {
    render() {
		let modules = this.props.data.modules.filter(m => !m.adminEnabled && !m.hide)
			.map(m => <Module key={m.module} module={m} {...this.props} {...this.props.data} />);

		return (<div id="modules" className="module-content">
			<h3 className="title is-4">Modules</h3>
			<div className="settings-top">
				<div className="flex-container module-toggles">
					{modules}
				</div>
			</div>
		</div>);
    }
}

import React from 'react';
import Module from './Module.jsx';

export default class Modules extends React.Component {
    render() {
			let modules = this.props.data.modules.filter(m => !m.adminEnabled && !m.hide);

			if (this.props.activeOnly) {
				modules = modules.filter(m => m.enabled);
			}

			if (this.props.withSettings) {
				modules = modules.filter(m => m.hasPartial);
			}

			modules = modules.sort((a, b) => {
				if (a.module < b.module) { return -1; }
				if (a.module > b.module) { return 1; }
			});

			if (this.props.limit) {
				modules = modules.slice(0, this.props.limit);
			}

			modules = modules.map(m => <Module key={m.module} module={m} toggleModule={this.props.data.toggleModule} {...this.props} />);

			return (<div>
				<h3 className="title is-4">Modules</h3>
				<div className="settings-top">
					<div className="flex-container module-toggles">
						{modules}
					</div>
				</div>
			</div>);
    }
}

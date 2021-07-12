import React from 'react';
import ModuleList from './ModuleList.jsx';

export default class Modules extends React.Component {
    render() {
		return (<div id="modules" className="module-content">
			<ModuleList {...this.props} />
		</div>);
    }
}

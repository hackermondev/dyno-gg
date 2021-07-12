import React from 'react';
import Command from './Command.jsx';

export default class CommandGroup extends React.Component {
    render() {
		let group = this.props.group;
		let className = 'subtab-content is-active';

		let commands = group.commands.map(c => {
			const result = [];
			result.push(<Command key={c.name} command={c} {...this.props} />);
			return result;
		});

		return (<div id={'commands-' + group.name} className={className}>
			<div className='module-toggles'>{commands}</div>
			{/* <p className="help-text">
				More information for each command can be found on the <a href={'/commands#/' + group.name} title={group.name + ' Commands'}>{group.name} Commands</a> page.
			</p> */}
		</div>);
    }
}

import React from 'react';

export default class Variables extends React.Component {
    render() {
		return (<div className='help-text'>
			<strong>Variables:</strong>
			<ul>
				<li><code>{'{user}'}</code> - The user calling the command. Eg: <code>Hello {'{user}'}!</code></li>
				<li><code>{'{server}'}</code> - The server name</li>
				<li><code>{'{channel}'}</code> - The channel name</li>
				<li><code>{'{@user}'}</code> - Mention a user by their username (not nickname), replace <code>user</code> with username. Eg: <code>{'{@Nooblance}'}</code> </li>
				<li><code>{'{&role}'}</code> - Mention a role by name, replace <code>role</code> with the role name. Eg: <code>{'{&Gamers}'}, We're streaming now!</code></li>
				<li><code>{'{#channel}'}</code> - A channel link, replace <code>channel</code> with the name of the channel you want to link. Eg: <code>Use {'{#testing}'} for all bot testing.</code></li>
				<li><code>{'{everyone}'}</code> - {'@everyone'}</li>
				<li><code>{'{here}'}</code> - {'@here'}</li>
			</ul>
		</div>);
	}
}

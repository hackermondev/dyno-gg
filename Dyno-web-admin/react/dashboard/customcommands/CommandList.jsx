import axios from 'axios';
import React from 'react';
import ReactTooltip from 'react-tooltip';
import Loader from '../common/Loader.jsx';

export default class CommandList extends React.Component {
	state = {
		customcommands: {},
		prefix: '?',
		isLoading: true,
	}

	async componentWillMount() {
		try {
			let response = await axios.get(`/api/modules/${this.props.match.params.id}/customcommands`);

			this.setState({
				customcommands: response.data.customcommands || {},
				prefix: response.data.prefix || '?',
				isLoading: false,
			});
		} catch (e) {
			this.setState({ error: 'Failed to get data, try again later' });
		}
	}

    componentDidUpdate() {
        this.commandList = new List('commandList', {
			page: 8,
			pagination: {
				innerWindow: 1,
				outerWindow: 1,
				left: 0,
				right: 0,
				paginationClass: 'pagination-list',
			},
			valueNames: ['cmd-name', 'cmd-response'],
		});
    }

	deleteCommand(command) {
		if (command.key) {
			command.command = command.key;
		}

		const url = `/api/server/${this.props.match.params.id}/customCommand/delete`;
		const commandName = command.command;
		const data = { command: commandName };
		let htmlValue = `${this.state.prefix}${commandName}`;
		// escape the value to match list.js internal values
		htmlValue = htmlValue.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        axios.post(url, data)
            .then((res) => {
                if (res.status === 200) {
					this.commandList.remove('cmd-name', htmlValue);
                    _showSuccess('Command removed.');
                } else {
                    _showError('An error occurred.');
                }
            })
            .catch((err) => {
                if (err) {
                    _showError('An error occurred.');
                }
			});
	}

	editCommand (command) {

	}

	pick(o, ...props) {
		return Object.assign({}, ...Object.keys(o).filter(k => [...props].includes(k))
			.map(prop => ({ [prop]: o[prop] })));
	}

	ucfirst(str) {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}

	render() {
		if (this.state.isLoading) {
			return <Loader />;
		}

		const { customcommands } = this.state;
		const commands = customcommands.commands ? Object.keys(customcommands.commands).map(key => Object.assign(customcommands.commands[key], { key })) : [];

		return (<div id='customcommands-list'>
			<div className='settings-content'>
				{commands ? (
					<div id='commandList'>
						<table className='table is-striped'>
							<thead>
								<tr>
									<th>Command</th>
									<th>Response</th>
									<th></th>
								</tr>
							</thead>
							<tbody className='list'>
								{commands.map(c => (
									<tr key={c.command || Math.random()}>
										<td className='cmd-name'>
											{!c || !c.command ? 'Invalid Command' : `${this.state.prefix}${c.command}`}
										</td>
										<td className='cmd-response'><code className='command-response'>
											{!c || !c.response ? 'Invalid Command, please remove.' : c.response}
										</code></td>
										<td>
											<a className='button is-danger is-outlined command-remove' onClick={() => {
												if (window.confirm(`Are you sure you want to delete ${c.name}?`)) {
													this.deleteCommand(c)
												}
											}} >Remove</a>
											<a className='button is-info command-edit' onClick={this.editCommand.bind(this, c)} >Edit</a>
										</td>
									</tr>))}
							</tbody>
						</table>
						<nav className='pagination' role='navigation' aria-label='pagination'>
							<ul className='pagination-list'></ul>
						</nav>
					</div>
				) : (<h4>There are no commands.</h4>)}
			</div>
		</div>)
	}
}
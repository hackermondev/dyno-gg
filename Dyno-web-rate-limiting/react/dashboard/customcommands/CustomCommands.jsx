import axios from 'axios';
import React from 'react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import ModuleSettings from '../common/ModuleSettings.jsx';
import CommandModal from './CommandModal.jsx';
import CommandList from './CommandList.jsx';
import PaginatedTable from '../common/PaginatedTable.jsx';
import { EmbedBuilder } from '../common/Embed';
import Modal from 'react-responsive-modal';

export default class CustomCommands extends React.Component {
	state = {
		customcommands: {},
		channels: [],
		prefix: '?',
		roles: [],
        isAddOpen: false,
		isLoading: true,
        editModal: {
            open: false,
        },
	}

	async componentWillMount() {
		try {
			let response = await axios.get(`/api/modules/${this.props.match.params.id}/customcommands/full`);

			this.setState({
				customcommands: response.data.customcommands || {},
				channels: response.data.channels || [],
				prefix: response.data.prefix || '?',
				roles: response.data.roles || [],
				isLoading: false,
			});
		} catch (e) {
			this.setState({ error: 'Failed to get data, try again later' });
		}
	}

    deleteCommand(command) {
        const url = `/api/server/${this.props.match.params.id}/customCommand/delete`;
        const commandName = command.command;
        const data = { command: commandName };

        axios.post(url, data)
            .then((res) => {
                if (res.status === 200) {
					const { customcommands } = this.state;
					delete customcommands.commands[command.command];

					this.setState({ customcommands });

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

    pick(o, ...props) {
        return Object.assign({}, ...Object.keys(o).filter(k => [...props].includes(k))
            .map(prop => ({ [prop]: o[prop] })));
    }

    ucfirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    handleNewCommand = (command) => {
		const { customcommands } = this.state;

		customcommands.commands = customcommands.commands || {};
		customcommands.commands[command.command] = command;

		this.setState({ customcommands });
		this.addModalClose();
	}

    handleUpdatedCommand = (command) => {
		const { customcommands } = this.state;

		customcommands.commands = customcommands.commands || {};
		customcommands.commands[command.command] = command;

        this.setState({ customcommands });
        this.editModalClose();
    }

	addModal = () => {
		this.setState({ isAddOpen: true });
	}

    addModalClose = () => {
        this.setState({ isAddOpen: false });
    }

    editCommand = (command) => {
        this.setState({ editModal: { open: true, command: command } });
    }

    editModalClose = () => {
		this.setState({ editModal: { open: false, command: false } });
    }

    render() {
		const { customcommands } = this.state;
		const commands = customcommands.commands ? Object.keys(customcommands.commands).map(key => customcommands.commands[key]) : [];

        const modalClasses = {
            modal: 'commands-modal',
		};

		const data = {
			headers: [
				'Command',
				'Response',
				'',
			],
			searchableColumnsIds: [0, 1],
			rows: commands.map(c => ({
				fields: [
					{ value: !c || !c.command ? 'Invalid Command' : (<span className="command-name">{`${this.state.prefix}${c.command}`}</span>) },
					{ value: !c || !c.response ? 'Invalid Command, please remove.' : (
						<code className='command-response'>{c.response}</code>
					) },
					{ value: (
						<span>
							<a className='button is-info is-rounded command-edit' onClick={() => this.editCommand(c)} >Edit</a>
							<a className='button is-danger is-outlined is-rounded command-remove' onClick={() => {
								if (window.confirm(`Are you sure you want to delete ${c.name}?`)) {
									this.deleteCommand(c);
								}
							 }} >Remove</a>
						</span>
					) },
				],
			})),
		};

		return (<ModuleSettings {...this.props} name='customcommands' title='Custom Commands' isLoading={this.state.isLoading}>
			<p>
				<button className='button is-info' onClick={this.addModal}>Add Command</button>
			</p>
			<div id='customcommands-list'>
				{commands ? (
					<div id='commandList'>
						<PaginatedTable data={data} pageLimit={10} search />
					</div>
				) : (<h4>There are no commands.</h4>)}
			</div>
			<Modal open={this.state.isAddOpen} classNames={modalClasses} onClose={this.addModalClose}>
				<CommandModal {...this.props} {...this.state} onClose={this.handleNewCommand} />
			</Modal>
			<Modal open={this.state.editModal.open} classNames={modalClasses} onClose={this.editModalClose}>
				<CommandModal {...this.props} {...this.state} onClose={this.handleUpdatedCommand} command={this.state.editModal.command} />
			</Modal>
		</ModuleSettings>);
    }
}

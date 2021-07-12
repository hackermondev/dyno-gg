import axios from 'axios';
import React from 'react';
import Modal from 'react-responsive-modal';
import ModuleSettings from '../common/ModuleSettings.jsx';
import ResponseModal from './ResponseModal.jsx';
import ResponseList from './ResponseList.jsx';
import PaginatedTable from '../common/PaginatedTable.jsx';
import { EmbedBuilder } from '../common/Embed';

export default class AutoResponder extends React.Component {
	state = {
		autoresponder: {},
		channels: [],
		emojis: [],
		roles: [],
        isAddOpen: false,
		isLoading: true,
        editModal: {
            open: false,
        },
	}

	async componentWillMount() {
		try {
			let response = await axios.get(`/api/modules/${this.props.match.params.id}/autoresponder`);

			this.setState({
				autoresponder: response.data.autoresponder || {},
				channels: response.data.channels || [],
				emojis: response.data.emojis || [],
				isLoading: false,
			});
		} catch (e) {
			this.setState({ error: 'Failed to get data, try again later' });
		}
	}

    deleteCommand(command) {
        const url = `/api/server/${this.props.match.params.id}/autoresponder/delete`;
		const data = { command };

        axios.post(url, data)
            .then((res) => {
                if (res.status === 200) {
					const { autoresponder } = this.state;
					const index = autoresponder.commands.findIndex(c => c.command === command.command);

					if (index > -1) {
						autoresponder.commands.splice(index, 1);
						this.setState({ autoresponder });
					}

                    _showSuccess('Response removed.');
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

    handleNewResponse = (command) => {
		const { autoresponder } = this.state;

		this.addModalClose();

		autoresponder.commands = autoresponder.commands || [];
		autoresponder.commands.push(command);

		this.setState({ autoresponder });
	}

    handleUpdateResponse = (command) => {
		const { autoresponder } = this.state;

		this.editModalClose();

		autoresponder.commands = autoresponder.commands || [];
		const index = autoresponder.commands.findIndex(c => c.command === command);

		if (index > -1) {
			autoresponder.commands[index] = command;
			this.setState({ autoresponder });
		}
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
		this.setState({ editModal: { open: false } });
    }

    render() {
		const { autoresponder } = this.state;
		const commands = autoresponder.commands || [];

        const modalClasses = {
            modal: 'commands-modal',
		};

		const data = {
			headers: [
				'Trigger',
				'Response',
				'',
			],
			searchableColumnsIds: [0, 1],
			rows: commands.map(c => ({
				fields: [
					{ value: !c || !c.command ? 'Invalid Response' : `${c.command}` },
					{ value: !c || (!c.response && c.type === 'message') ? 'Invalid Response, please remove.' : c.response || '' },
					{ value: (
						<span>
							<a className='button is-info command-edit' onClick={() => this.editCommand(c)} >Edit</a>
							<a className='button is-danger is-outlined is-rounded command-remove' onClick={() => this.deleteCommand(c)} >Remove</a>
						</span>
					) },
				],
			})),
		};

		return (<ModuleSettings {...this.props} name='autoresponder' title='Auto Responder' isLoading={this.state.isLoading}>
			<p>
				<button className='button is-info' onClick={this.addModal}>Add Response</button>
			</p>
			<div id='customcommands-list'>
				{commands ? (
					<div id='responseList'>
						<PaginatedTable data={data} pageLimit={10} search />
					</div>
				) : (<h4>There are no auto responses.</h4>)}
			</div>
			<Modal open={this.state.isAddOpen} classNames={modalClasses} onClose={this.addModalClose}>
				<ResponseModal {...this.props} {...this.state} onClose={this.handleNewResponse} />
			</Modal>
			<Modal open={this.state.editModal.open} classNames={modalClasses} onClose={this.editModalClose}>
				<ResponseModal {...this.props} {...this.state} onClose={this.handleUpdateResponse} command={this.state.editModal.command} />
			</Modal>
		</ModuleSettings>);
    }
}

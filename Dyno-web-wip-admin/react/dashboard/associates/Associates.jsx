import React from 'react';
import axios from 'axios';
import Associate from './Associate.jsx';
import AssociateModal from './AssociateModal.jsx';
import Modal from 'react-responsive-modal';
import ModuleSettings from '../common/ModuleSettings.jsx';

export default class Associates extends ModuleSettings {
	state = {
		associates: [],
		isAddOpen: false,
		editModal: {
			open: false,
		},
	}

	async componentDidMount() {
		try {
			let response = await axios.get(`/api/server/${this.props.match.params.id}/associates`);
			this.setState({
				associates: response.data.associates || [],
			});
		} catch (e) {
			this.setState({ error: 'Failed to get data, try again later' });
		}
	}

	addModal = () => {
		this.setState({ isAddOpen: true });
	}

	addModalClose = (associate) => {
		if (associate) {
			const { associates } = this.state;
			associates.push(associate);
			this.setState({ associates });
		}
		this.setState({ isAddOpen: false });
	}

	editModalClose = (associate) => {
		if (associate) {
			const { associates } = this.state;
			const index = associates.findIndex(a => a.name === associate.name);
			if (index > -1) {
				associates[index] = associate;
				this.setState({ associates });
			}
		}
		this.setState({ editModal: { open: false, associate: {} } });
	}

	editAssociate = (associate) => {
		this.setState({ editModal: { open: true, associate } });
	}

	deleteAssociate = async (associate) => {
		try {
			await axios.post(`/api/server/${this.props.match.params.id}/associates/delete`, { associate });
			const { associates } = this.state;
			const index = associates.findIndex(a => a.name === associate.name);
			if (index > -1) {
				associates.splice(index, 1);
				this.setState({ associates });
			}
			return _showSuccess(`Deleted associate ${associate.name}`);
		} catch (err) {
			return _showError(err);
		}
	}

    render() {
		const { associates } = this.state;

		const modalClasses = {
            modal: 'commands-modal',
        };

		return (<div id="module-associates" className="module-content module-settings">
			<h3 className='title is-4'>Associates {this.ModuleToggle}</h3>
			<p>
				<button className='button is-success' onClick={this.addModal}>Add Associate</button>
			</p>
			<div className='associates-list'>
				{associates.filter(a => a.id).map((associate, index) => (
					<Associate key={index} {...this.props} associate={associate} onEdit={this.editAssociate} onDelete={this.deleteAssociate} />
				))}
				{associates.filter(a => !a.id).map((associate, index) => (
					<Associate key={index} {...this.props} associate={associate} onEdit={this.editAssociate} onDelete={this.deleteAssociate} />
				))}
			</div>
			<Modal open={this.state.isAddOpen} classNames={modalClasses} onClose={this.addModalClose} closeOnOverlayClick={false} closeOnEsc={false}>
				<AssociateModal {...this.props} {...this.state} onClose={this.addModalClose} />
			</Modal>
			<Modal open={this.state.editModal.open} classNames={modalClasses} onClose={this.editModalClose} closeOnOverlayClick={false} closeOnEsc={false}>
				<AssociateModal {...this.props} {...this.state} onClose={this.editModalClose} associate={this.state.editModal.associate} isEdit={true} />
			</Modal>
		</div>);
    }
}
